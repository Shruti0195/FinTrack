from datetime import datetime, date, timezone, timedelta
import calendar
import threading
import logging
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, and_, or_
from app.models.user import User
from app.models.budget import Budget
from app.models.goal import Goal, GoalContribution
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.notification import Notification
from app.models.alert_record import AlertRecord
from app.services.email_service import send_budget_alert_email, send_goal_milestone_email

logger = logging.getLogger(__name__)

_evaluation_lock = threading.Lock()

def evaluate_and_generate_notifications(db: Session, user: User) -> List[Notification]:
    """
    Evaluates current budgets, goals, and reports for the user,
    creating notifications when thresholds are crossed or milestones reached.
    Uses the private AlertRecord table for deduplication and re-arming,
    independent of visible user notifications.
    """
    with _evaluation_lock:
        return _evaluate_and_generate_notifications_locked(db, user)

def _evaluate_and_generate_notifications_locked(db: Session, user: User) -> List[Notification]:
    """
    Evaluates current budgets, goals, and reports for the user,
    creating notifications when thresholds are crossed or milestones reached.
    """
    now = datetime.now(timezone.utc)
    current_year = now.year
    current_month = now.month
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    days_left = max(1, days_in_month - now.day + 1)

    # 1. EVALUATE BUDGET ALERTS (Dynamic thresholds, channels & baseline)
    budgets = db.query(Budget).filter(
        Budget.user_id == user.id
    ).all()

    for budget in budgets:
        b_month = budget.month
        b_year = budget.year
        period_id = f"{b_year}-{b_month:02d}"

        if budget.has_custom_alerts and budget.custom_alert_thresholds:
            thresholds = sorted([int(x) for x in budget.custom_alert_thresholds if 1 <= int(x) <= 150])
            send_in_app = budget.custom_alert_in_app if budget.custom_alert_in_app is not None else True
            send_email = budget.custom_alert_email if budget.custom_alert_email is not None else True
        else:
            raw_t = user.budget_alert_thresholds if user.budget_alert_thresholds is not None else [80, 100]
            thresholds = sorted([int(x) for x in raw_t if 1 <= int(x) <= 150])
            send_in_app = user.budget_alert_in_app if user.budget_alert_in_app is not None else True
            send_email = user.budget_alert_email if user.budget_alert_email is not None else getattr(user, 'email_budget_alerts', True)

        spent = float(db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.user_id == user.id,
            Transaction.type == 'expense',
            Transaction.category_id == budget.category_id,
            extract('year', Transaction.transaction_date) == b_year,
            extract('month', Transaction.transaction_date) == b_month
        ).scalar() or 0.0)

        limit = float(budget.limit_amount)
        if limit <= 0:
            continue

        pct = (spent / limit) * 100.0
        round_b_pct = int(round(pct))
        baseline = float(budget.alert_baseline_pct or 0.0)

        cat = db.query(Category).filter(Category.id == budget.category_id).first()
        cat_name = cat.name if cat else "Expense"

        for t in thresholds:
            # RE-ARMING: if progress drops back below threshold, remove existing AlertRecord
            if round_b_pct < t:
                db.query(AlertRecord).filter(
                    AlertRecord.user_id == user.id,
                    AlertRecord.budget_id == budget.id,
                    AlertRecord.alert_type == 'budget_threshold',
                    AlertRecord.threshold == t,
                    AlertRecord.period_identifier == period_id
                ).delete(synchronize_session=False)
                db.commit()
                continue

            if not send_in_app and not send_email:
                continue

            alert_key = f"budget:{budget.id}:{t}:{period_id}"
            existing_rec = db.query(AlertRecord).filter(
                AlertRecord.user_id == user.id,
                AlertRecord.alert_key == alert_key
            ).first()

            if not existing_rec:
                # Do not trigger retroactively if threshold was reached prior to threshold update
                if t <= baseline:
                    continue

                if t >= 100:
                    title = f"{cat_name} Budget Exceeded ({t}%+)"
                    msg = f"You've exceeded your {cat_name} budget ({round_b_pct}%, ₹{spent:,.0f} of ₹{limit:,.0f}). Adjust your budget or track upcoming expenses."
                else:
                    title = f"{cat_name} Budget {t}% Reached"
                    msg = f"Your {cat_name} budget is {pct:.0f}% used (₹{spent:,.0f} of ₹{limit:,.0f}) with {days_left} days left in the month."

                notif = None
                in_app_sent_at = None
                if send_in_app:
                    notif = Notification(
                        user_id=user.id,
                        budget_id=budget.id,
                        type=f"budget_{t}",
                        title=title,
                        message=msg,
                        target_tab='budgets',
                        is_read=False
                    )
                    db.add(notif)
                    db.commit()
                    db.refresh(notif)
                    in_app_sent_at = datetime.now(timezone.utc)

                email_sent_at = None
                if send_email and user.email_alerts_enabled:
                    try:
                        email_ok = send_budget_alert_email(
                            email_to=user.email,
                            name=user.name,
                            category_name=cat_name,
                            spent_amount=spent,
                            limit_amount=limit,
                            pct_used=pct,
                            days_left=days_left
                        )
                        if email_ok:
                            email_sent_at = datetime.now(timezone.utc)
                            if notif:
                                notif.email_sent_at = email_sent_at
                                db.commit()
                    except Exception as em_err:
                        logger.error(f"Error sending budget alert email: {em_err}")

                # Create private AlertRecord
                new_rec = AlertRecord(
                    user_id=user.id,
                    alert_type='budget_threshold',
                    budget_id=budget.id,
                    threshold=t,
                    period_identifier=period_id,
                    alert_key=alert_key,
                    in_app_sent_at=in_app_sent_at,
                    email_sent_at=email_sent_at
                )
                db.add(new_rec)
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            else:
                # Alert already recorded. Check if email was never sent and is now requested
                if send_email and user.email_alerts_enabled and existing_rec.email_sent_at is None:
                    try:
                        email_ok = send_budget_alert_email(
                            email_to=user.email,
                            name=user.name,
                            category_name=cat_name,
                            spent_amount=spent,
                            limit_amount=limit,
                            pct_used=pct,
                            days_left=days_left
                        )
                        if email_ok:
                            existing_rec.email_sent_at = datetime.now(timezone.utc)
                            db.commit()
                    except Exception as em_err:
                        logger.error(f"Error sending budget alert email: {em_err}")

    # 2. EVALUATE SAVINGS GOAL MILESTONES & DEADLINES
    goals = db.query(Goal).filter(Goal.user_id == user.id).all()
    for goal in goals:
        target = float(goal.target_amount)
        if target <= 0:
            continue

        if goal.has_custom_alerts:
            raw_m = goal.custom_milestone_thresholds if goal.custom_milestone_thresholds is not None else [25, 50, 75, 100]
            milestones = sorted([int(x) for x in raw_m if 1 <= int(x) <= 100])
            deadline_days = goal.custom_deadline_reminder_days if goal.custom_deadline_reminder_days is not None else 7
            inactivity_days = goal.custom_inactivity_nudge_days if goal.custom_inactivity_nudge_days is not None else 30
            send_in_app = goal.custom_alert_in_app if goal.custom_alert_in_app is not None else True
            send_email = goal.custom_alert_email if goal.custom_alert_email is not None else True
        else:
            raw_m = user.goal_milestone_thresholds if user.goal_milestone_thresholds is not None else [25, 50, 75, 100]
            milestones = sorted([int(x) for x in raw_m if 1 <= int(x) <= 100])
            deadline_days = user.goal_deadline_reminder_days if user.goal_deadline_reminder_days is not None else 7
            inactivity_days = user.goal_inactivity_nudge_days if user.goal_inactivity_nudge_days is not None else 30
            send_in_app = user.goal_alert_in_app if user.goal_alert_in_app is not None else True
            send_email = user.goal_alert_email if user.goal_alert_email is not None else getattr(user, 'goal_milestone_notifs', True)

        saved = float(db.query(func.coalesce(func.sum(GoalContribution.amount), 0.0)).filter(
            GoalContribution.goal_id == goal.id
        ).scalar() or 0.0)

        g_pct = (saved / target) * 100.0
        round_pct = int(round(g_pct))
        baseline = float(goal.alert_baseline_pct or 0.0)

        # A. Milestone alerts
        for m in milestones:
            # RE-ARMING: if progress drops back below milestone, remove existing AlertRecord
            if round_pct < m:
                db.query(AlertRecord).filter(
                    AlertRecord.user_id == user.id,
                    AlertRecord.goal_id == goal.id,
                    AlertRecord.alert_type == 'goal_milestone',
                    AlertRecord.threshold == m
                ).delete(synchronize_session=False)
                db.commit()
                continue

            if not send_in_app and not send_email:
                continue

            alert_key = f"goal_milestone:{goal.id}:{m}"
            existing_m = db.query(AlertRecord).filter(
                AlertRecord.user_id == user.id,
                AlertRecord.alert_key == alert_key
            ).first()

            if not existing_m:
                if m <= baseline:
                    continue

                if m >= 100:
                    g_msg = f"Congratulations! You've fully achieved your '{goal.title}' savings goal of ₹{target:,.0f}! 🎉"
                    g_title = "Goal Milestone: 100% Achieved"
                else:
                    g_msg = f"Great progress! You've reached {m}% (₹{saved:,.0f} of ₹{target:,.0f}) of your '{goal.title}' goal."
                    g_title = f"Goal Milestone: {m}% Reached"

                notif = None
                in_app_sent_at = None
                if send_in_app:
                    notif = Notification(
                        user_id=user.id,
                        goal_id=goal.id,
                        type=f"goal_milestone_{m}",
                        title=g_title,
                        message=g_msg,
                        target_tab='goals',
                        is_read=False
                    )
                    db.add(notif)
                    db.commit()
                    db.refresh(notif)
                    in_app_sent_at = datetime.now(timezone.utc)

                email_sent_at = None
                if send_email and user.email_alerts_enabled:
                    try:
                        email_ok = send_goal_milestone_email(
                            email_to=user.email,
                            name=user.name,
                            goal_title=goal.title,
                            saved_amount=saved,
                            target_amount=target,
                            milestone_pct=m
                        )
                        if email_ok:
                            email_sent_at = datetime.now(timezone.utc)
                            if notif:
                                notif.email_sent_at = email_sent_at
                                db.commit()
                    except Exception as em_err:
                        logger.error(f"Error sending goal milestone email: {em_err}")

                new_rec = AlertRecord(
                    user_id=user.id,
                    alert_type='goal_milestone',
                    goal_id=goal.id,
                    threshold=m,
                    period_identifier='all_time',
                    alert_key=alert_key,
                    in_app_sent_at=in_app_sent_at,
                    email_sent_at=email_sent_at
                )
                db.add(new_rec)
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            else:
                # Alert already recorded. Check if email was unsent and now enabled
                if send_email and user.email_alerts_enabled and existing_m.email_sent_at is None:
                    try:
                        email_ok = send_goal_milestone_email(
                            email_to=user.email,
                            name=user.name,
                            goal_title=goal.title,
                            saved_amount=saved,
                            target_amount=target,
                            milestone_pct=m
                        )
                        if email_ok:
                            existing_m.email_sent_at = datetime.now(timezone.utc)
                            db.commit()
                    except Exception as em_err:
                        logger.error(f"Error sending goal milestone email: {em_err}")

        # B. Deadline check (once per reminder type per deadline date; extends safely with new deadline)
        if deadline_days is not None and deadline_days >= 0 and goal.deadline and goal.status != 'completed':
            today_date = date.today()
            diff_days = (goal.deadline - today_date).days
            if diff_days >= 0:
                # Map diff_days to applicable reminder threshold: 0 (day of), 3 (3 days), 7 (7 days), or custom deadline_days
                if diff_days == 0:
                    applicable_threshold = 0
                elif diff_days <= 3:
                    applicable_threshold = 3
                elif diff_days <= 7:
                    applicable_threshold = 7
                else:
                    applicable_threshold = deadline_days

                # Only fire if diff_days is within the user's configured deadline_days
                if diff_days <= deadline_days and applicable_threshold <= deadline_days:
                    period_id = str(goal.deadline)
                    alert_key = f"goal_deadline:{goal.id}:{applicable_threshold}:{period_id}"
                    existing_dl = db.query(AlertRecord).filter(
                        AlertRecord.user_id == user.id,
                        AlertRecord.alert_key == alert_key
                    ).first()

                    if not existing_dl:
                        rem = max(0.0, target - saved)
                        when_txt = "today" if diff_days == 0 else f"in {diff_days} day{'s' if diff_days != 1 else ''}"
                        title = f"Goal Deadline Today: '{goal.title}'" if diff_days == 0 else f"Deadline Approaching: '{goal.title}'"
                        msg = f"Your '{goal.title}' goal target date is {when_txt}. You are ₹{rem:,.0f} away from target."

                        in_app_sent_at = None
                        if send_in_app:
                            db.add(Notification(
                                user_id=user.id,
                                goal_id=goal.id,
                                type=f"goal_deadline_{applicable_threshold}",
                                title=title,
                                message=msg,
                                target_tab='goals',
                                is_read=False
                            ))
                            db.commit()
                            in_app_sent_at = datetime.now(timezone.utc)

                        new_rec = AlertRecord(
                            user_id=user.id,
                            alert_type='goal_deadline',
                            goal_id=goal.id,
                            threshold=applicable_threshold,
                            period_identifier=period_id,
                            alert_key=alert_key,
                            in_app_sent_at=in_app_sent_at
                        )
                        db.add(new_rec)
                        try:
                            db.commit()
                        except Exception:
                            db.rollback()

        # C. Inactivity Nudge
        if inactivity_days is not None and inactivity_days > 0 and goal.status != 'completed':
            today_date = date.today()
            last_contrib = db.query(GoalContribution).filter(
                GoalContribution.goal_id == goal.id
            ).order_by(GoalContribution.contributed_at.desc(), GoalContribution.created_at.desc()).first()
            last_date = last_contrib.contributed_at if last_contrib else (goal.created_at.date() if goal.created_at else today_date)
            days_inactive = (today_date - last_date).days
            if days_inactive >= inactivity_days:
                period_id = str(last_date)
                alert_key = f"goal_inactive:{goal.id}:{inactivity_days}:{period_id}"
                existing_inact = db.query(AlertRecord).filter(
                    AlertRecord.user_id == user.id,
                    AlertRecord.alert_key == alert_key
                ).first()

                if not existing_inact:
                    in_app_sent_at = None
                    if send_in_app:
                        db.add(Notification(
                            user_id=user.id,
                            goal_id=goal.id,
                            type=f"goal_inactive_{inactivity_days}",
                            title=f"Goal Inactivity: '{goal.title}'",
                            message=f"It's been {days_inactive} days since your last contribution to '{goal.title}'. Even a small deposit keeps you on track!",
                            target_tab='goals',
                            is_read=False
                        ))
                        db.commit()
                        in_app_sent_at = datetime.now(timezone.utc)

                    new_rec = AlertRecord(
                        user_id=user.id,
                        alert_type='goal_inactivity',
                        goal_id=goal.id,
                        threshold=inactivity_days,
                        period_identifier=period_id,
                        alert_key=alert_key,
                        in_app_sent_at=in_app_sent_at
                    )
                    db.add(new_rec)
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

    # 3. EVALUATE MONTHLY REPORT NOTIFICATION
    if getattr(user, 'monthly_report_notifs', True):
        m_name = calendar.month_name[current_month]
        period_id = f"{current_year}-{current_month:02d}"
        alert_key = f"monthly_report:{period_id}"
        existing_report = db.query(AlertRecord).filter(
            AlertRecord.user_id == user.id,
            AlertRecord.alert_key == alert_key
        ).first()

        if not existing_report:
            db.add(Notification(
                user_id=user.id,
                type='monthly_report',
                title=f"Monthly Financial Report Ready",
                message=f"Your financial summary report for {m_name} {current_year} is ready to view.",
                target_tab='analytics',
                is_read=False
            ))
            db.commit()

            new_rec = AlertRecord(
                user_id=user.id,
                alert_type='monthly_report',
                period_identifier=period_id,
                alert_key=alert_key,
                in_app_sent_at=datetime.now(timezone.utc)
            )
            db.add(new_rec)
            try:
                db.commit()
            except Exception:
                db.rollback()

    # 4. EVALUATE MONTHLY EXPENSES VS MONTHLY INCOME ALERTS
    distinct_months = db.query(
        extract('year', Transaction.transaction_date).label('yr'),
        extract('month', Transaction.transaction_date).label('mo')
    ).filter(
        Transaction.user_id == user.id
    ).group_by('yr', 'mo').all()

    if not distinct_months:
        distinct_months = [(current_year, current_month)]

    for row in distinct_months:
        try:
            yr = int(row.yr) if hasattr(row, 'yr') else int(row[0])
            mo = int(row.mo) if hasattr(row, 'mo') else int(row[1])
        except (TypeError, ValueError, AttributeError):
            yr = current_year
            mo = current_month

        m_name = calendar.month_name[mo]
        period_id = f"{yr}-{mo:02d}"

        tot_income = float(db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.user_id == user.id,
            Transaction.type == 'income',
            extract('year', Transaction.transaction_date) == yr,
            extract('month', Transaction.transaction_date) == mo
        ).scalar() or 0.0)

        tot_expenses = float(db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.user_id == user.id,
            Transaction.type == 'expense',
            extract('year', Transaction.transaction_date) == yr,
            extract('month', Transaction.transaction_date) == mo
        ).scalar() or 0.0)

        if tot_income > 0:
            inc_exp_pct = (tot_expenses / tot_income) * 100.0

            # Re-arming: if ratio dropped below threshold, remove existing AlertRecord
            if inc_exp_pct < 100.0:
                db.query(AlertRecord).filter(
                    AlertRecord.user_id == user.id,
                    AlertRecord.alert_type == 'income_expense',
                    AlertRecord.threshold == 100,
                    AlertRecord.period_identifier == period_id
                ).delete(synchronize_session=False)
                db.commit()

            if inc_exp_pct < 80.0:
                db.query(AlertRecord).filter(
                    AlertRecord.user_id == user.id,
                    AlertRecord.alert_type == 'income_expense',
                    AlertRecord.threshold == 80,
                    AlertRecord.period_identifier == period_id
                ).delete(synchronize_session=False)
                db.commit()

            if inc_exp_pct >= 100.0:
                diff = tot_expenses - tot_income
                title_str = f"Expenses Exceed Income ({m_name} {yr})"
                msg_str = f"Your expenses for {m_name} {yr} (₹{tot_expenses:,.0f}) have exceeded your income (₹{tot_income:,.0f}) by ₹{diff:,.0f}. Review your spending to stay balanced."
                alert_key = f"income_expense:100:{period_id}"

                existing_rec = db.query(AlertRecord).filter(
                    AlertRecord.user_id == user.id,
                    AlertRecord.alert_key == alert_key
                ).first()

                if not existing_rec:
                    db.add(Notification(
                        user_id=user.id,
                        type='income_expense_100',
                        title=title_str,
                        message=msg_str,
                        target_tab='expenses',
                        is_read=False
                    ))
                    db.commit()

                    new_rec = AlertRecord(
                        user_id=user.id,
                        alert_type='income_expense',
                        threshold=100,
                        period_identifier=period_id,
                        alert_key=alert_key,
                        in_app_sent_at=datetime.now(timezone.utc)
                    )
                    db.add(new_rec)
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

            elif inc_exp_pct >= 80.0:
                title_str = f"Expenses at {inc_exp_pct:.0f}% of Income ({m_name} {yr})"
                msg_str = f"Your expenses for {m_name} {yr} (₹{tot_expenses:,.0f}) have reached {inc_exp_pct:.0f}% of your monthly income (₹{tot_income:,.0f}). A little planning can keep you on track."
                alert_key = f"income_expense:80:{period_id}"

                existing_rec = db.query(AlertRecord).filter(
                    AlertRecord.user_id == user.id,
                    AlertRecord.alert_key == alert_key
                ).first()

                if not existing_rec:
                    db.add(Notification(
                        user_id=user.id,
                        type='income_expense_80',
                        title=title_str,
                        message=msg_str,
                        target_tab='expenses',
                        is_read=False
                    ))
                    db.commit()

                    new_rec = AlertRecord(
                        user_id=user.id,
                        alert_type='income_expense',
                        threshold=80,
                        period_identifier=period_id,
                        alert_key=alert_key,
                        in_app_sent_at=datetime.now(timezone.utc)
                    )
                    db.add(new_rec)
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

    # Return all notifications for user
    return db.query(Notification).filter(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc()).all()
