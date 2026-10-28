import uuid
import math
import random
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.goal import Goal, GoalContribution, GoalIcon, GoalColor
from pydantic import BaseModel
from app.schemas.goal import (
    GoalOut,
    GoalCreate,
    GoalUpdate,
    GoalContributionOut,
    GoalContributionCreate,
    GoalContributionUpdate,
    GoalSummaryOut,
    GoalAlertSettings,
    GoalAlertPauseRequest,
    GoalAlertStatusResponse,
    GoalCardAlertUpdate,
)

router = APIRouter()

def calculate_goal_details(goal: Goal, contributions: List[GoalContribution]) -> dict:
    """Helper to compute saved amount, percentage, days remaining, monthly suggestion, and cheering message."""
    today = date.today()
    saved_amount = sum(float(c.amount) for c in contributions)
    target_amount = float(goal.target_amount)
    remaining_amount = max(0.0, target_amount - saved_amount)
    
    percentage = round((saved_amount / target_amount * 100), 1) if target_amount > 0 else 0.0
    percentage = min(100.0, percentage) if goal.status == 'completed' else percentage

    days_remaining = None
    suggested_monthly_savings = 0.0

    if goal.deadline:
        delta_days = (goal.deadline - today).days
        days_remaining = max(0, delta_days)
        
        # Calculate months remaining (minimum 1)
        months_left = max(1, math.ceil(delta_days / 30.44)) if delta_days > 0 else 1
        if remaining_amount > 0 and delta_days > 0:
            suggested_monthly_savings = round(remaining_amount / months_left, 2)
        else:
            suggested_monthly_savings = 0.0

    # Auto-complete status check
    is_achieved = saved_amount >= target_amount
    current_status = 'completed' if is_achieved else goal.status

    # Last contribution date for inactivity check
    last_contrib_date = contributions[0].contributed_at if contributions else None
    days_since_last_contrib = (today - last_contrib_date).days if last_contrib_date else None

    # Generate warm, personal cheering message
    title = goal.title
    if is_achieved or current_status == 'completed':
        cheering_message = f"Woohoo! You've achieved your goal for '{title}'! What an incredible milestone! 🎉"
    elif goal.deadline and goal.deadline < today and not is_achieved:
        cheering_message = f"Your deadline passed, but you're already {percentage:.0f}% there for '{title}'! Feel free to extend your deadline anytime."
    elif percentage >= 75.0:
        cheering_message = f"Incredible progress! You are {percentage:.0f}% of the way to reaching '{title}'!"
    elif percentage >= 50.0:
        cheering_message = f"Halfway there! '{title}' is getting closer every single day. Keep going!"
    elif percentage >= 25.0:
        cheering_message = f"Strong momentum! You've crossed {percentage:.0f}% of your target for '{title}'."
    elif days_since_last_contrib and days_since_last_contrib >= 14:
        cheering_message = f"Every small step counts towards '{title}'! Add ₹100 whenever you're ready."
    elif len(contributions) == 0:
        cheering_message = f"Great start! Your '{title}' fund begins today."
    else:
        cheering_message = f"Awesome work! You've saved ₹{saved_amount:,.0f} towards '{title}'."

    sorted_contributions = sorted(contributions, key=lambda c: (c.contributed_at, c.created_at), reverse=True)

    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "title": goal.title,
        "target_amount": target_amount,
        "saved_amount": round(saved_amount, 2),
        "remaining_amount": round(remaining_amount, 2),
        "percentage": percentage,
        "deadline": goal.deadline,
        "days_remaining": days_remaining,
        "suggested_monthly_savings": suggested_monthly_savings,
        "color": goal.color or "#10B981",
        "icon": goal.icon or "target",
        "status": current_status,
        "cheering_message": cheering_message,
        "has_custom_alerts": bool(goal.has_custom_alerts),
        "custom_milestone_thresholds": goal.custom_milestone_thresholds,
        "custom_deadline_reminder_days": goal.custom_deadline_reminder_days,
        "custom_inactivity_nudge_days": goal.custom_inactivity_nudge_days,
        "custom_alert_in_app": goal.custom_alert_in_app,
        "custom_alert_email": goal.custom_alert_email,
        "contributions": [GoalContributionOut.model_validate(c) for c in sorted_contributions],
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
    }


@router.get("/alert-settings", response_model=GoalAlertSettings)
def get_user_goal_alert_settings(
    current_user: User = Depends(get_current_user),
):
    """
    Get user default goal milestone thresholds, reminders, and delivery channels.
    """
    milestones = current_user.goal_milestone_thresholds if current_user.goal_milestone_thresholds is not None else [25, 50, 75, 100]
    deadline_reminder = current_user.goal_deadline_reminder_days if current_user.goal_deadline_reminder_days is not None else 7
    inactivity_nudge = current_user.goal_inactivity_nudge_days if current_user.goal_inactivity_nudge_days is not None else 30
    in_app = current_user.goal_alert_in_app if current_user.goal_alert_in_app is not None else True
    email = current_user.goal_alert_email if current_user.goal_alert_email is not None else getattr(current_user, 'goal_milestone_notifs', True)
    return GoalAlertSettings(
        milestone_thresholds=milestones,
        deadline_reminder_days=deadline_reminder,
        inactivity_nudge_days=inactivity_nudge,
        in_app=in_app,
        email=email,
    )


@router.put("/alert-settings", response_model=GoalAlertSettings)
def update_user_goal_alert_settings(
    settings_in: GoalAlertSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user default goal milestone thresholds, reminders, and delivery channels.
    """
    clean_milestones = sorted(list(set(int(m) for m in settings_in.milestone_thresholds if 1 <= int(m) <= 100)))[:5]
    if not clean_milestones:
        clean_milestones = [25, 50, 75, 100]

    current_user.goal_milestone_thresholds = clean_milestones
    current_user.goal_deadline_reminder_days = settings_in.deadline_reminder_days
    current_user.goal_inactivity_nudge_days = settings_in.inactivity_nudge_days
    current_user.goal_alert_in_app = settings_in.in_app
    current_user.goal_alert_email = settings_in.email
    current_user.goal_milestone_notifs = settings_in.email

    # Set baseline for all non-custom goals to prevent retroactive alerts
    user_goals = db.query(Goal).filter(Goal.user_id == current_user.id, Goal.has_custom_alerts == False).all()
    for g in user_goals:
        saved = db.query(func.coalesce(func.sum(GoalContribution.amount), 0.0)).filter(
            GoalContribution.goal_id == g.id
        ).scalar() or 0.0
        pct = (float(saved) / float(g.target_amount) * 100.0) if float(g.target_amount) > 0 else 0.0
        g.alert_baseline_pct = round(pct, 2)
        db.add(g)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return GoalAlertSettings(
        milestone_thresholds=current_user.goal_milestone_thresholds,
        deadline_reminder_days=current_user.goal_deadline_reminder_days,
        inactivity_nudge_days=current_user.goal_inactivity_nudge_days,
        in_app=current_user.goal_alert_in_app,
        email=current_user.goal_alert_email,
    )


@router.get("/alerts/status", response_model=GoalAlertStatusResponse)
def get_goal_alerts_status(
    current_user: User = Depends(get_current_user),
):
    """
    Check if goal alerts are currently paused and until when.
    """
    now = datetime.now(timezone.utc)
    is_paused = current_user.is_goal_alerts_paused(now)
    return GoalAlertStatusResponse(
        is_paused=is_paused,
        paused_until=current_user.goal_alerts_paused_until if is_paused else None,
    )


@router.post("/alerts/pause", response_model=GoalAlertStatusResponse)
def pause_goal_alerts(
    pause_in: GoalAlertPauseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pause goal alerts for a specified duration or indefinitely.
    """
    now = datetime.now(timezone.utc)
    if pause_in.duration == "1_day":
        paused_until = now + timedelta(days=1)
    elif pause_in.duration == "1_week":
        paused_until = now + timedelta(days=7)
    elif pause_in.duration == "1_month":
        paused_until = now + timedelta(days=30)
    else:  # "indefinite"
        paused_until = None

    current_user.goal_alerts_paused = True
    current_user.goal_alerts_paused_until = paused_until
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return GoalAlertStatusResponse(
        is_paused=True,
        paused_until=current_user.goal_alerts_paused_until,
    )


@router.post("/alerts/resume", response_model=GoalAlertStatusResponse)
def resume_goal_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resume goal alerts immediately.
    """
    current_user.goal_alerts_paused = False
    current_user.goal_alerts_paused_until = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    return GoalAlertStatusResponse(
        is_paused=False,
        paused_until=None,
    )


@router.put("/{goal_id}/alerts", response_model=GoalOut)
def update_single_goal_alerts(
    goal_id: uuid.UUID,
    alert_in: GoalCardAlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update alert settings for an individual goal card, with optional 'apply to all'.
    """
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found.",
        )

    clean_milestones = sorted(list(set(int(m) for m in alert_in.milestone_thresholds if 1 <= int(m) <= 100)))[:5]
    if not clean_milestones and (alert_in.in_app or alert_in.email):
        clean_milestones = [25, 50, 75, 100]

    deadline_rem = None if alert_in.deadline_reminder_days in [-1, None] else alert_in.deadline_reminder_days
    inact_nudge = None if alert_in.inactivity_nudge_days in [-1, None] else alert_in.inactivity_nudge_days

    goal.has_custom_alerts = True
    goal.custom_milestone_thresholds = clean_milestones
    goal.custom_deadline_reminder_days = deadline_rem
    goal.custom_inactivity_nudge_days = inact_nudge
    goal.custom_alert_in_app = alert_in.in_app
    goal.custom_alert_email = alert_in.email

    contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    saved = sum(float(c.amount) for c in contributions)
    target = float(goal.target_amount)
    goal.alert_baseline_pct = round((saved / target * 100.0), 2) if target > 0 else 0.0
    db.add(goal)

    # Remember the user's last choice
    current_user.goal_milestone_thresholds = clean_milestones
    current_user.goal_deadline_reminder_days = deadline_rem
    current_user.goal_inactivity_nudge_days = inact_nudge
    current_user.goal_alert_in_app = alert_in.in_app
    current_user.goal_alert_email = alert_in.email
    db.add(current_user)

    if alert_in.apply_to_all:
        other_goals = db.query(Goal).filter(Goal.user_id == current_user.id, Goal.id != goal.id).all()
        for og in other_goals:
            og.has_custom_alerts = True
            og.custom_milestone_thresholds = clean_milestones
            og.custom_deadline_reminder_days = deadline_rem
            og.custom_inactivity_nudge_days = inact_nudge
            og.custom_alert_in_app = alert_in.in_app
            og.custom_alert_email = alert_in.email
            og_contribs = db.query(GoalContribution).filter(GoalContribution.goal_id == og.id).all()
            og_saved = sum(float(c.amount) for c in og_contribs)
            og_target = float(og.target_amount)
            og.alert_baseline_pct = round((og_saved / og_target * 100.0), 2) if og_target > 0 else 0.0
            db.add(og)

    db.commit()
    db.refresh(goal)

    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    details = calculate_goal_details(goal, contributions)
    return GoalOut(**details)


@router.get("", response_model=List[GoalOut])
def list_user_goals(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all financial goals for the authenticated user."""
    query = db.query(Goal).filter(Goal.user_id == current_user.id)
    if status_filter in ['active', 'completed']:
        query = query.filter(Goal.status == status_filter)
        
    goals = query.order_by(desc(Goal.created_at)).all()
    
    result = []
    for g in goals:
        contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == g.id).all()
        details = calculate_goal_details(g, contributions)
        result.append(GoalOut(**details))
        
    return result


@router.get("/summary", response_model=GoalSummaryOut)
def get_goals_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve overall KPI metrics for all user goals."""
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    
    total_goals = len(goals)
    active_goals = 0
    completed_goals = 0
    total_target = 0.0
    total_saved = 0.0

    for g in goals:
        contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == g.id).all()
        saved = sum(float(c.amount) for c in contributions)
        target = float(g.target_amount)
        
        total_target += target
        total_saved += saved
        
        if saved >= target or g.status == 'completed':
            completed_goals += 1
        else:
            active_goals += 1

    overall_pct = round((total_saved / total_target * 100), 1) if total_target > 0 else 0.0

    return GoalSummaryOut(
        total_goals=total_goals,
        active_goals=active_goals,
        completed_goals=completed_goals,
        total_target_amount=round(total_target, 2),
        total_saved_amount=round(total_saved, 2),
        overall_percentage=overall_pct
    )


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new savings goal."""
    target_deadline = goal_in.deadline
    if not target_deadline and goal_in.months:
        target_deadline = date.today() + timedelta(days=goal_in.months * 30)

    # Determine alert settings: use provided or user's remembered defaults
    if goal_in.custom_milestone_thresholds is not None:
        init_milestones = sorted(list(set(int(m) for m in goal_in.custom_milestone_thresholds if 1 <= int(m) <= 100)))[:5]
        init_deadline = None if goal_in.custom_deadline_reminder_days in [-1, None] else goal_in.custom_deadline_reminder_days
        init_inact = None if goal_in.custom_inactivity_nudge_days in [-1, None] else goal_in.custom_inactivity_nudge_days
        init_in_app = goal_in.custom_alert_in_app if goal_in.custom_alert_in_app is not None else True
        init_email = goal_in.custom_alert_email if goal_in.custom_alert_email is not None else True

        # Remember this choice
        current_user.goal_milestone_thresholds = init_milestones
        current_user.goal_deadline_reminder_days = init_deadline
        current_user.goal_inactivity_nudge_days = init_inact
        current_user.goal_alert_in_app = init_in_app
        current_user.goal_alert_email = init_email
        db.add(current_user)
    else:
        init_milestones = current_user.goal_milestone_thresholds or [25, 50, 75, 100]
        init_deadline = current_user.goal_deadline_reminder_days if current_user.goal_deadline_reminder_days is not None else 7
        init_inact = current_user.goal_inactivity_nudge_days if current_user.goal_inactivity_nudge_days is not None else 30
        init_in_app = current_user.goal_alert_in_app if current_user.goal_alert_in_app is not None else True
        init_email = current_user.goal_alert_email if current_user.goal_alert_email is not None else True

    new_goal = Goal(
        user_id=current_user.id,
        title=goal_in.title.strip(),
        target_amount=goal_in.target_amount,
        deadline=target_deadline,
        color=goal_in.color or "#10B981",
        icon=goal_in.icon or "target",
        status='active',
        has_custom_alerts=True,
        custom_milestone_thresholds=init_milestones,
        custom_deadline_reminder_days=init_deadline,
        custom_inactivity_nudge_days=init_inact,
        custom_alert_in_app=init_in_app,
        custom_alert_email=init_email,
        alert_baseline_pct=0.0,
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    details = calculate_goal_details(new_goal, [])
    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    return GoalOut(**details)


class GoalOptionIcon(BaseModel):
    id: str
    name: str
    icon_key: str

class GoalOptionColor(BaseModel):
    id: str
    name: str
    hex: str

class GoalOptionsResponse(BaseModel):
    icons: List[GoalOptionIcon]
    colors: List[GoalOptionColor]

@router.get("/options", response_model=GoalOptionsResponse)
def get_goal_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns available goal icons and color tags managed by the Admin.
    """
    icons = db.query(GoalIcon).order_by(GoalIcon.created_at.asc()).all()
    colors = db.query(GoalColor).order_by(GoalColor.created_at.asc()).all()

    return GoalOptionsResponse(
        icons=[GoalOptionIcon(id=str(i.id), name=i.name, icon_key=i.icon_key) for i in icons],
        colors=[GoalOptionColor(id=str(c.id), name=c.name, hex=c.hex) for c in colors],
    )


@router.get("/{goal_id}", response_model=GoalOut)
def get_goal_detail(
    goal_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve single goal by ID with detailed contribution history."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    details = calculate_goal_details(goal, contributions)
    return GoalOut(**details)


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: uuid.UUID,
    goal_in: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing goal's target, name, deadline, color, or status."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    if goal_in.title is not None:
        goal.title = goal_in.title.strip()
    if goal_in.target_amount is not None:
        goal.target_amount = goal_in.target_amount
    if goal_in.deadline is not None:
        goal.deadline = goal_in.deadline
    if goal_in.color is not None:
        goal.color = goal_in.color
    if goal_in.icon is not None:
        goal.icon = goal_in.icon
    if goal_in.status is not None:
        goal.status = goal_in.status

    if goal_in.has_custom_alerts is not None:
        goal.has_custom_alerts = goal_in.has_custom_alerts
        if goal_in.has_custom_alerts:
            if goal_in.custom_milestone_thresholds is not None:
                goal.custom_milestone_thresholds = sorted(list(set(int(m) for m in goal_in.custom_milestone_thresholds if 1 <= int(m) <= 100)))[:5]
            if goal_in.custom_deadline_reminder_days is not None:
                goal.custom_deadline_reminder_days = goal_in.custom_deadline_reminder_days
            if goal_in.custom_inactivity_nudge_days is not None:
                goal.custom_inactivity_nudge_days = goal_in.custom_inactivity_nudge_days
            if goal_in.custom_alert_in_app is not None:
                goal.custom_alert_in_app = goal_in.custom_alert_in_app
            if goal_in.custom_alert_email is not None:
                goal.custom_alert_email = goal_in.custom_alert_email
        else:
            goal.custom_milestone_thresholds = None
            goal.custom_deadline_reminder_days = None
            goal.custom_inactivity_nudge_days = None
            goal.custom_alert_in_app = None
            goal.custom_alert_email = None

    contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    saved_amount = sum(float(c.amount) for c in contributions)
    target = float(goal.target_amount)
    goal.alert_baseline_pct = round((saved_amount / target * 100.0), 2) if target > 0 else 0.0

    # Recalculate auto status
    if saved_amount >= float(goal.target_amount):
        goal.status = 'completed'

    db.add(goal)
    db.commit()
    db.refresh(goal)

    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    details = calculate_goal_details(goal, contributions)
    return GoalOut(**details)


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a goal and all associated contributions."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    db.delete(goal)
    db.commit()

    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    return {"message": "Goal deleted successfully", "id": str(goal_id)}


@router.post("/{goal_id}/contributions", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def add_contribution(
    goal_id: uuid.UUID,
    contrib_in: GoalContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add money towards a specific savings goal."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    existing_contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    current_saved = sum(float(c.amount) for c in existing_contributions)
    target_amt = float(goal.target_amount)

    if goal.status == 'completed' or current_saved >= target_amt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal is already completed. No further contributions allowed."
        )

    remaining_target = max(0.0, target_amt - current_saved)
    if contrib_in.amount > remaining_target + 0.001:  # small float margin
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Contribution amount ₹{contrib_in.amount:,.2f} exceeds remaining goal target. Maximum allowed contribution is ₹{remaining_target:,.2f}."
        )

    contrib_date = contrib_in.contributed_at or date.today()

    new_contrib = GoalContribution(
        goal_id=goal.id,
        amount=contrib_in.amount,
        note=contrib_in.note.strip() if contrib_in.note else None,
        contributed_at=contrib_date
    )
    db.add(new_contrib)
    db.commit()

    contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    saved_amount = sum(float(c.amount) for c in contributions)
    
    # Auto mark completed if target reached
    if saved_amount >= float(goal.target_amount):
        goal.status = 'completed'
        db.add(goal)
        db.commit()

    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    details = calculate_goal_details(goal, contributions)
    return GoalOut(**details)


@router.put("/{goal_id}/contributions/{contribution_id}", response_model=GoalOut)
def update_contribution(
    goal_id: uuid.UUID,
    contribution_id: uuid.UUID,
    contrib_in: GoalContributionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit a past contribution (amount, date, note)."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    contrib = db.query(GoalContribution).filter(
        GoalContribution.id == contribution_id,
        GoalContribution.goal_id == goal.id
    ).first()
    if not contrib:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution entry not found.")

    if contrib_in.amount is not None:
        existing_contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
        saved_without_this = sum(float(c.amount) for c in existing_contributions if c.id != contrib.id)
        target_amt = float(goal.target_amount)
        max_allowed = max(0.0, target_amt - saved_without_this)

        if contrib_in.amount > max_allowed + 0.001:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Contribution amount ₹{contrib_in.amount:,.2f} exceeds goal target limit. Maximum allowed for this entry is ₹{max_allowed:,.2f} (Goal target: ₹{target_amt:,.2f})."
            )
        contrib.amount = contrib_in.amount

    if contrib_in.note is not None:
        contrib.note = contrib_in.note.strip() or None
    if contrib_in.contributed_at is not None:
        contrib.contributed_at = contrib_in.contributed_at

    db.add(contrib)
    db.commit()

    contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    saved_amount = sum(float(c.amount) for c in contributions)
    
    if saved_amount >= float(goal.target_amount):
        goal.status = 'completed'
    else:
        goal.status = 'active'
    db.add(goal)
    db.commit()

    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    details = calculate_goal_details(goal, contributions)
    return GoalOut(**details)


@router.delete("/{goal_id}/contributions/{contribution_id}", response_model=GoalOut)
def delete_contribution(
    goal_id: uuid.UUID,
    contribution_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a contribution entry from goal history."""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    contrib = db.query(GoalContribution).filter(
        GoalContribution.id == contribution_id,
        GoalContribution.goal_id == goal.id
    ).first()
    if not contrib:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution entry not found.")

    db.delete(contrib)
    db.commit()

    contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    saved_amount = sum(float(c.amount) for c in contributions)
    
    if saved_amount < float(goal.target_amount) and goal.status == 'completed':
        goal.status = 'active'
        db.add(goal)
        db.commit()

    try:
        from app.services.notification_service import evaluate_and_generate_notifications
        evaluate_and_generate_notifications(db, current_user)
    except Exception:
        db.rollback()

    details = calculate_goal_details(goal, contributions)
    return GoalOut(**details)


