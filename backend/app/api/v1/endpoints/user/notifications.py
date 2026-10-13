import uuid
import traceback
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.api.deps import get_current_user
from app.services.notification_service import evaluate_and_generate_notifications

router = APIRouter()

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

    class Config:
        from_attributes = True

class NotificationsResponse(BaseModel):
    unread_count: int
    total_count: int
    items: List[NotificationOut]

@router.get("", response_model=NotificationsResponse)
def get_notifications(
    only_unread: bool = False,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates budget & goal rules and returns user's notifications.
    """
    # First, run real-time evaluation rule engine
    try:
        evaluate_and_generate_notifications(db, current_user)
    except Exception as e:
        print(f"[NOTIF ERROR] evaluate_and_generate_notifications failed: {e}")
        traceback.print_exc()
        db.rollback()

    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    unread_count = query.filter(Notification.is_read == False).count()
    total_count = query.count()

    if only_unread:
        query = query.filter(Notification.is_read == False)

    items = query.order_by(Notification.created_at.desc()).limit(limit).all()

    return NotificationsResponse(
        unread_count=unread_count,
        total_count=total_count,
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
    """
    updated = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read", "count": updated}

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
