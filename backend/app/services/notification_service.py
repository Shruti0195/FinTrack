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
from app.services.email_service import send_budget_alert_email, send_goal_milestone_email

logger = logging.getLogger(__name__)

_evaluation_lock = threading.Lock()

def evaluate_and_generate_notifications(db: Session, user: User) -> List[Notification]:
    """
    Evaluates current budgets, goals, and reports for the user,
    creating notifications when thresholds are crossed or milestones reached.
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

    # 1. EVALUATE BUDGET ALERTS (80% and 100%)
    budgets = db.query(Budget).filter(
        Budget.user_id == user.id
    ).all()

    for budget in budgets:
        b_month = budget.month
        b_year = budget.year

        # Calculate spent for this budget category in its target month & year
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
        cat = db.query(Category).filter(Category.id == budget.category_id).first()
        cat_name = cat.name if cat else "Expense"

        # Check 100% threshold first
        if round_b_pct >= 100:
            existing_100 = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.budget_id == budget.id,
                Notification.type == 'budget_100'
            ).first()

            if not existing_100:
                msg = f"You've exceeded your {cat_name} budget (₹{spent:,.0f} of ₹{limit:,.0f}). Adjust your budget or track upcoming expenses."
                notif = Notification(
                    user_id=user.id,
                    budget_id=budget.id,
                    type='budget_100',
                    title=f"{cat_name} Budget Exceeded (100%+)",
                    message=msg,
                    target_tab='budgets',
                    is_read=False
                )
                db.add(notif)
                db.commit()
                db.refresh(notif)

                # Check email dispatch settings
                if user.email_alerts_enabled and getattr(user, 'email_budget_alerts', True):
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
                            notif.email_sent_at = datetime.now(timezone.utc)
                            db.commit()
                    except Exception as em_err:
                        logger.error(f"Error sending budget alert email: {em_err}")

        # Check 80% threshold (between 80% and 100%)
        elif round_b_pct >= 80:
            existing_80 = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.budget_id == budget.id,
                Notification.type == 'budget_80'
            ).first()

            if not existing_80:
                msg = f"Your {cat_name} budget is {pct:.0f}% used (₹{spent:,.0f} of ₹{limit:,.0f}) with {days_left} days left in the month. A little planning can keep you on track."
                notif = Notification(
                    user_id=user.id,
                    budget_id=budget.id,
                    type='budget_80',
                    title=f"{cat_name} Budget 80% Reached",
                    message=msg,
                    target_tab='budgets',
                    is_read=False
                )
                db.add(notif)
                db.commit()
                db.refresh(notif)

                if user.email_alerts_enabled and getattr(user, 'email_budget_alerts', True):
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
                            notif.email_sent_at = datetime.now(timezone.utc)
                            db.commit()
                    except Exception as em_err:
                        logger.error(f"Error sending budget alert email: {em_err}")

    # 2. EVALUATE SAVINGS GOAL MILESTONES & DEADLINES
    if getattr(user, 'goal_milestone_notifs', True):
        goals = db.query(Goal).filter(Goal.user_id == user.id).all()
        for goal in goals:
            target = float(goal.target_amount)
            if target <= 0:
                continue

            saved = float(db.query(func.coalesce(func.sum(GoalContribution.amount), 0.0)).filter(
                GoalContribution.goal_id == goal.id
            ).scalar() or 0.0)

            g_pct = (saved / target) * 100.0
            round_pct = int(round(g_pct))

            # Determine the single highest milestone bracket currently reached
            current_bracket = None
            if round_pct >= 100:
                current_bracket = 100
            elif round_pct >= 75:
                current_bracket = 75
            elif round_pct >= 50:
                current_bracket = 50
            elif round_pct >= 25:
                current_bracket = 25

            if current_bracket is not None:
                # Find all milestone percentages already notified for this goal
                existing_milestone_notifs = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.goal_id == goal.id,
                    Notification.type == 'goal_milestone'
                ).all()

                already_notified = set()
                for en in existing_milestone_notifs:
                    for m in [25, 50, 75, 90, 95, 100]:
                        if en.title and f"{m}%" in en.title:
                            already_notified.add(m)

                max_notified = max(already_notified) if already_notified else 0

                # Only notify if goal reached a higher milestone bracket than previously notified
                if current_bracket > max_notified:
                    if current_bracket == 100:
                        g_msg = f"Congratulations! You've fully achieved your '{goal.title}' savings goal of ₹{target:,.0f}! 🎉"
                        g_title = f"Goal Milestone: 100% Achieved"
                    else:
                        g_msg = f"Great progress! You've reached {current_bracket}% (₹{saved:,.0f} of ₹{target:,.0f}) of your '{goal.title}' goal."
                        g_title = f"Goal Milestone: {current_bracket}% Reached"

                    notif = Notification(
                        user_id=user.id,
                        goal_id=goal.id,
                        type='goal_milestone',
                        title=g_title,
                        message=g_msg,
                        target_tab='goals',
                        is_read=False
                    )
                    # Commit to DB first to prevent any concurrent race condition duplicate
                    db.add(notif)
                    db.commit()
                    db.refresh(notif)

                    # Send milestone email once
                    if user.email_alerts_enabled and getattr(user, 'goal_milestone_notifs', True):
                        try:
                            email_ok = send_goal_milestone_email(
                                email_to=user.email,
                                name=user.name,
                                goal_title=goal.title,
                                saved_amount=saved,
                                target_amount=target,
                                milestone_pct=current_bracket
                            )
                            if email_ok:
                                notif.email_sent_at = datetime.now(timezone.utc)
                                db.commit()
                        except Exception as em_err:
                            logger.error(f"Error sending goal milestone email: {em_err}")

            # Deadline check
            if goal.deadline and goal.status != 'completed':
                today_date = date.today()
                diff_days = (goal.deadline - today_date).days

                if 0 <= diff_days <= 7:
                    existing_deadline_close = db.query(Notification).filter(
                        Notification.user_id == user.id,
                        Notification.goal_id == goal.id,
                        Notification.type == 'goal_deadline',
                        Notification.title.like("%Approaching%")
                    ).first()

                    if not existing_deadline_close:
                        rem = max(0.0, target - saved)
                        db.add(Notification(
                            user_id=user.id,
                            goal_id=goal.id,
                            type='goal_deadline',
                            title=f"Deadline Approaching: '{goal.title}'",
                            message=f"Your '{goal.title}' goal target date is in {diff_days} days. You are ₹{rem:,.0f} away from target.",
                            target_tab='goals',
                            is_read=False
                        ))
                        db.commit()

                elif diff_days < 0:
                    existing_deadline_passed = db.query(Notification).filter(
                        Notification.user_id == user.id,
                        Notification.goal_id == goal.id,
                        Notification.type == 'goal_deadline',
                        Notification.title.like("%Passed%")
                    ).first()

                    if not existing_deadline_passed:
                        db.add(Notification(
                            user_id=user.id,
                            goal_id=goal.id,
                            type='goal_deadline',
                            title=f"Target Date Passed: '{goal.title}'",
                            message=f"Target date for '{goal.title}' has passed. You saved ₹{saved:,.0f} of ₹{target:,.0f}.",
                            target_tab='goals',
                            is_read=False
                        ))
                        db.commit()

    # 3. EVALUATE MONTHLY REPORT NOTIFICATION
    if getattr(user, 'monthly_report_notifs', True):
        m_name = calendar.month_name[current_month]
        existing_report = db.query(Notification).filter(
            Notification.user_id == user.id,
            Notification.type == 'monthly_report',
            extract('year', Notification.created_at) == current_year,
            extract('month', Notification.created_at) == current_month
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

            if inc_exp_pct >= 100.0:
                diff = tot_expenses - tot_income
                title_str = f"Expenses Exceed Income ({m_name} {yr})"
                msg_str = f"Your expenses for {m_name} {yr} (₹{tot_expenses:,.0f}) have exceeded your income (₹{tot_income:,.0f}) by ₹{diff:,.0f}. Review your spending to stay balanced."

                existing = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.type == 'income_expense_100',
                    or_(
                        Notification.title.like(f"%({m_name} {yr})%"),
                        Notification.title == "Expenses Exceed Monthly Income"
                    )
                ).first()

                if not existing:
                    db.add(Notification(
                        user_id=user.id,
                        type='income_expense_100',
                        title=title_str,
                        message=msg_str,
                        target_tab='expenses',
                        is_read=False
                    ))
                    db.commit()
                elif existing.message != msg_str or existing.title != title_str:
                    existing.title = title_str
                    existing.message = msg_str
                    existing.is_read = False
                    db.commit()

            elif inc_exp_pct >= 80.0:
                title_str = f"Expenses at {inc_exp_pct:.0f}% of Income ({m_name} {yr})"
                msg_str = f"Your expenses for {m_name} {yr} (₹{tot_expenses:,.0f}) have reached {inc_exp_pct:.0f}% of your monthly income (₹{tot_income:,.0f}). A little planning can keep you on track."

                existing = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.type == 'income_expense_80',
                    or_(
                        Notification.title.like(f"%({m_name} {yr})%"),
                        Notification.title.like("Expenses at % of Monthly Income")
                    )
                ).first()

                if not existing:
                    db.add(Notification(
                        user_id=user.id,
                        type='income_expense_80',
                        title=title_str,
                        message=msg_str,
                        target_tab='expenses',
                        is_read=False
                    ))
                    db.commit()
                elif existing.message != msg_str or existing.title != title_str:
                    existing.title = title_str
                    existing.message = msg_str
                    existing.is_read = False
                    db.commit()

    # Return all notifications for user
    return db.query(Notification).filter(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc()).all()
