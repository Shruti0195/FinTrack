import uuid
import math
import random
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.goal import Goal, GoalContribution
from app.schemas.goal import (
    GoalOut,
    GoalCreate,
    GoalUpdate,
    GoalContributionOut,
    GoalContributionCreate,
    GoalContributionUpdate,
    GoalSummaryOut,
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
        "contributions": [GoalContributionOut.model_validate(c) for c in sorted_contributions],
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
    }


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

    new_goal = Goal(
        user_id=current_user.id,
        title=goal_in.title.strip(),
        target_amount=goal_in.target_amount,
        deadline=target_deadline,
        color=goal_in.color or "#10B981",
        icon=goal_in.icon or "target",
        status='active'
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    details = calculate_goal_details(new_goal, [])
    return GoalOut(**details)


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

    db.add(goal)
    db.commit()
    db.refresh(goal)

    contributions = db.query(GoalContribution).filter(GoalContribution.goal_id == goal.id).all()
    
    # Recalculate auto status
    saved_amount = sum(float(c.amount) for c in contributions)
    if saved_amount >= float(goal.target_amount):
        goal.status = 'completed'
        db.add(goal)
        db.commit()

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

    details = calculate_goal_details(goal, contributions)
    return GoalOut(**details)
