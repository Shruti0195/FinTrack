import uuid
import traceback
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.goal import Goal, GoalContribution
from app.api.deps import get_current_user
from app.services.notification_service import evaluate_and_generate_notifications

router = APIRouter()

class NotificationDetails(BaseModel):
    category_name: Optional[str] = None
    spent_amount: Optional[float] = None
    limit_amount: Optional[float] = None
    percentage_used: Optional[float] = None
    goal_title: Optional[str] = None
    saved_amount: Optional[float] = None
    target_amount: Optional[float] = None
    goal_percentage: Optional[float] = None

class NotificationOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    budget_id: Optional[uuid.UUID] = None
    goal_id: Optional[uuid.UUID] = None
    type: str
    title: Optional[str] = None
    message: str
    target_tab: Optional[str] = 'dashboard'
    is_read: bool
    email_sent_at: Optional[datetime] = None
    created_at: datetime
    details: Optional[NotificationDetails] = None

    class Config:
        from_attributes = True

class NotificationsResponse(BaseModel):
    unread_count: int
    total_count: int
    has_more: bool = False
    items: List[NotificationOut]

@router.get("", response_model=NotificationsResponse)
def get_notifications(
    only_unread: bool = False,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates budget & goal rules and returns user's notifications.
    Supports pagination (offset & limit).
    Runs automatic cleanup: removes notifications that are read AND older than 90 days.
    Unread notifications are NEVER removed automatically.
    """
    # 1. Run real-time evaluation rule engine
    try:
        evaluate_and_generate_notifications(db, current_user)
    except Exception as e:
        print(f"[NOTIF ERROR] evaluate_and_generate_notifications failed: {e}")
        traceback.print_exc()
        db.rollback()

    # 2. Automatic cleanup: Delete notifications that are read AND older than 90 days
    try:
        ninety_days_ago = datetime.now(timezone.utc) - timedelta(days=90)
        db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == True,
            Notification.created_at < ninety_days_ago
        ).delete(synchronize_session=False)
        db.commit()
    except Exception as cleanup_err:
        print(f"[NOTIF ERROR] Auto-cleanup failed: {cleanup_err}")
        db.rollback()

    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    unread_count = query.filter(Notification.is_read == False).count()
    total_count = query.count()

    if only_unread:
        query = query.filter(Notification.is_read == False)

    raw_items = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
    has_more = (offset + len(raw_items)) < (query.count() if only_unread else total_count)

    # 3. Enrich notifications with figures (category, spent, limit, saved, target)
    budget_ids = [item.budget_id for item in raw_items if item.budget_id]
    goal_ids = [item.goal_id for item in raw_items if item.goal_id]

    budgets_map = {}
    if budget_ids:
        b_list = db.query(Budget).filter(Budget.id.in_(budget_ids)).all()
        for b in b_list:
            cat = db.query(Category).filter(Category.id == b.category_id).first()
            spent = float(db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
                Transaction.user_id == current_user.id,
                Transaction.type == 'expense',
                Transaction.category_id == b.category_id,
                extract('year', Transaction.transaction_date) == b.year,
                extract('month', Transaction.transaction_date) == b.month
            ).scalar() or 0.0)
            lim = float(b.limit_amount)
            pct = round((spent / lim * 100.0), 1) if lim > 0 else 0.0
            budgets_map[b.id] = {
                "category_name": cat.name if cat else "Budget",
                "spent_amount": spent,
                "limit_amount": lim,
                "percentage_used": pct
            }

    goals_map = {}
    if goal_ids:
        g_list = db.query(Goal).filter(Goal.id.in_(goal_ids)).all()
        for g in g_list:
            saved = float(db.query(func.coalesce(func.sum(GoalContribution.amount), 0.0)).filter(
                GoalContribution.goal_id == g.id
            ).scalar() or 0.0)
            tgt = float(g.target_amount)
            pct = round((saved / tgt * 100.0), 1) if tgt > 0 else 0.0
            goals_map[g.id] = {
                "goal_title": g.title,
                "saved_amount": saved,
                "target_amount": tgt,
                "goal_percentage": pct
            }

    items = []
    for item in raw_items:
        detail_data = None
        if item.budget_id and item.budget_id in budgets_map:
            b_info = budgets_map[item.budget_id]
            detail_data = NotificationDetails(
                category_name=b_info["category_name"],
                spent_amount=b_info["spent_amount"],
                limit_amount=b_info["limit_amount"],
                percentage_used=b_info["percentage_used"]
            )
        elif item.goal_id and item.goal_id in goals_map:
            g_info = goals_map[item.goal_id]
            detail_data = NotificationDetails(
                goal_title=g_info["goal_title"],
                saved_amount=g_info["saved_amount"],
                target_amount=g_info["target_amount"],
                goal_percentage=g_info["goal_percentage"]
            )

        # Redirect legacy target_tab if needed
        tab = item.target_tab
        if tab in ('reports', 'notifications'):
            tab = 'analytics' if tab == 'reports' else 'dashboard'

        items.append(NotificationOut(
            id=item.id,
            user_id=item.user_id,
            budget_id=item.budget_id,
            goal_id=item.goal_id,
            type=item.type,
            title=item.title,
            message=item.message,
            target_tab=tab,
            is_read=item.is_read,
            email_sent_at=item.email_sent_at,
            created_at=item.created_at,
            details=detail_data
        ))

    return NotificationsResponse(
        unread_count=unread_count,
        total_count=total_count,
        has_more=has_more,
        items=items
    )

@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a specific notification as read.
    Reading never removes or deletes the notification.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/mark-all-read")
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all unread notifications for current user as read.
    Reading never removes or deletes notifications.
    """
    updated = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read", "count": updated}

@router.delete("/clear-all")
def clear_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clear/remove all notifications for current user.
    """
    deleted_count = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "All notifications cleared successfully", "count": deleted_count}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific notification.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted successfully"}

