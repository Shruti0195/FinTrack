import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, asc, desc
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, PasswordReset
from app.api.deps import get_current_admin_user
from app.core.security import create_email_verification_token
from app.services.email_service import send_verification_email, send_password_reset_email

router = APIRouter()

class UserAdminItem(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: Literal['USER', 'ADMIN']
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    users: List[UserAdminItem]

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserSupportActionResponse(BaseModel):
    message: str
    success: bool = True
    action_link: Optional[str] = None

@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    status: Optional[str] = Query("all", description="Filter by status: all, active, disabled"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by: created_at, name, email, status"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Returns paginated list of users with search, status filtering, and sorting.
    STRICT PRIVACY: Never returns passwords or financial information.
    """
    query = db.query(User)

    # 1. Search filter (by name or email)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter((User.name.ilike(term)) | (User.email.ilike(term)))

    # 2. Status filter
    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "disabled":
        query = query.filter(User.is_active == False)

    # Total count matching filters
    total = query.count()

    # 3. Sorting
    is_asc = (sort_order.lower() == "asc") if sort_order else False
    if sort_by == "name":
        sort_col = User.name.asc() if is_asc else User.name.desc()
    elif sort_by == "email":
        sort_col = User.email.asc() if is_asc else User.email.desc()
    elif sort_by == "status":
        sort_col = User.is_active.asc() if is_asc else User.is_active.desc()
    else:
        # Default to created_at
        sort_col = User.created_at.asc() if is_asc else User.created_at.desc()

    query = query.order_by(sort_col)

    # 4. Pagination
    skip = (page - 1) * page_size
    users = query.offset(skip).limit(page_size).all()
    total_pages = max(1, (total + page_size - 1) // page_size) if total > 0 else 1

    return UserListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        users=users,
    )

@router.patch("/{user_id}/status", response_model=UserAdminItem)
def toggle_user_status(
    user_id: uuid.UUID,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Enable or disable a user account.
    - Admins can't disable themselves.
    - Admins can't disable the last remaining admin.
    - User data is preserved completely untouched.
    """
    # Rule 1: Admin cannot disable themselves
    if admin.id == user_id and not status_in.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own administrator account.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Rule 2: Cannot disable the last remaining admin
    if user.role == 'ADMIN' and not status_in.is_active:
        active_admin_count = db.query(func.count(User.id)).filter(
            User.role == 'ADMIN',
            User.is_active == True
        ).scalar() or 0

        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot disable the last remaining administrator account.",
            )

    user.is_active = status_in.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/resend-verification", response_model=UserSupportActionResponse)
def admin_resend_verification(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN SUPPORT ACTION:
    Generates and dispatches a fresh email verification link to user's registered email.
    Useful when a user contacts support saying they did not receive their activation email.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    token = create_email_verification_token(user.id)
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    email_sent = send_verification_email(user.email, user.name, token)

    if email_sent:
        message = f"A fresh verification email has been sent successfully to {user.email}."
    else:
        message = f"Could not deliver email via SMTP to {user.email}. You can copy the verification link below or directly activate the account."

    return UserSupportActionResponse(
        message=message,
        success=email_sent,
        action_link=verification_url
    )

@router.post("/{user_id}/manual-verify", response_model=UserSupportActionResponse)
def admin_manual_verify_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN DIRECT ACTION:
    Directly activates and marks the user's email as verified in the database.
    Instantly solves any email delivery blocking or verification issues.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.is_verified = True
    user.is_active = True
    user.email_verified_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserSupportActionResponse(
        message=f"Account for {user.name} ({user.email}) has been directly verified and activated!",
        success=True
    )

@router.post("/{user_id}/send-password-reset", response_model=UserSupportActionResponse)
def admin_send_password_reset(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN SUPPORT ACTION:
    Invalidates any previous unused reset tokens, generates a secure single-use password reset token,
    and sends reset instructions to the user's registered email.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Invalidate previous unused reset tokens for this user
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.used == False
    ).update({"used": True})

    # Generate single-use secure reset token (valid 24 hours for admin support)
    reset_token = secrets.token_urlsafe(32)
    reset_record = PasswordReset(
        user_id=user.id,
        token=reset_token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        used=False
    )
    db.add(reset_record)
    db.commit()

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    email_sent = send_password_reset_email(user.email, user.name, reset_token)

    if email_sent:
        message = f"Password reset instructions have been sent successfully to {user.email}."
    else:
        message = f"Could not deliver email via SMTP to {user.email}. You can copy the reset link below."

    return UserSupportActionResponse(
        message=message,
        success=email_sent,
        action_link=reset_url
    )
