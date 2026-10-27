import re
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.models.notification import Notification
from app.schemas.user import (
    UserOut,
    UserSettingsUpdate,
    ChangePasswordRequest,
    ChangePasswordResponse
)
from app.services.email_service import send_password_changed_email
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/profile", response_model=UserOut)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile and notification preferences."""
    return current_user

@router.patch("/profile", response_model=UserOut)
def update_user_settings(
    settings_in: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile details or toggle email_alerts_enabled.
    """
    if settings_in.name is not None:
        current_user.name = settings_in.name.strip()
    if settings_in.email_alerts_enabled is not None:
        current_user.email_alerts_enabled = settings_in.email_alerts_enabled
    if settings_in.email_budget_alerts is not None:
        current_user.email_budget_alerts = settings_in.email_budget_alerts
    if settings_in.goal_milestone_notifs is not None:
        current_user.goal_milestone_notifs = settings_in.goal_milestone_notifs
    if settings_in.monthly_report_notifs is not None:
        current_user.monthly_report_notifs = settings_in.monthly_report_notifs
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    req: ChangePasswordRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Safely changes the current user's password.
    - Validates current password (with rate-limiting: max 5 wrong attempts per 15 mins).
    - Validates new password rules (same as registration, not equal to current password, matching confirmation).
    - Revokes all other active device/browser sessions by incrementing token_version.
    - Returns a new access token for the current device so it stays logged in.
    - Creates an in-app notification ("Your password was changed.")
    - Sends an email alert with timestamp and reset link.
    """
    now = datetime.now(timezone.utc)

    # 1. Check rate limit on wrong current password attempts
    if current_user.password_attempt_locked_until and current_user.password_attempt_locked_until > now:
        remaining_minutes = max(1, int((current_user.password_attempt_locked_until - now).total_seconds() / 60))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many incorrect password attempts. Please wait {remaining_minutes} minute(s) before trying again, or use the 'Forgot your current password?' link to reset it."
        )

    # 2. Verify current password
    if not verify_password(req.current_password, current_user.password_hash):
        current_user.failed_password_attempts = (current_user.failed_password_attempts or 0) + 1
        if current_user.failed_password_attempts >= 5:
            current_user.password_attempt_locked_until = now + timedelta(minutes=15)
            current_user.failed_password_attempts = 0
            db.add(current_user)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect password attempts. Please wait 15 minutes before trying again, or use the 'Forgot your current password?' link to reset it."
            )
        db.add(current_user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That current password isn't right"
        )

    # Current password verified -> reset attempt counters
    current_user.failed_password_attempts = 0
    current_user.password_attempt_locked_until = None

    # 3. Validate new password
    if req.new_password == req.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your current password."
        )

    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match."
        )

    # Constraint: at least 6 characters long
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # 4. Hash new password & invalidate all other sessions via token_version increment
    current_user.password_hash = get_password_hash(req.new_password)
    new_version = (current_user.token_version or 1) + 1
    current_user.token_version = new_version
    db.add(current_user)

    # 5. Add in-app notification in top bar dropdown
    notif = Notification(
        user_id=current_user.id,
        type='system',
        title='Security Alert',
        message='Your password was changed.',
        target_tab='settings',
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(current_user)

    # 6. Generate fresh access token with new_version so current device remains logged in
    new_token = create_access_token(
        subject=str(current_user.id),
        token_version=new_version
    )

    # 7. Send notification email to user in background
    changed_at_str = now.strftime('%B %d, %Y at %I:%M %p UTC')
    reset_url = f"{settings.FRONTEND_URL}/#reset-password"
    background_tasks.add_task(
        send_password_changed_email,
        user_name=current_user.name,
        user_email=current_user.email,
        changed_at_str=changed_at_str,
        reset_url=reset_url
    )

    return ChangePasswordResponse(
        message="Your password has been updated. All other logged-in devices and browsers have been signed out.",
        access_token=new_token,
        token_type="bearer",
        success=True
    )
