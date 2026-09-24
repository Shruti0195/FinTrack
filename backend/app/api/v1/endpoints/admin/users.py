import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserOut
from app.api.deps import get_current_admin_user

router = APIRouter()

class UserStatusUpdate(BaseModel):
    is_active: bool

@router.get("", response_model=List[UserOut])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: List all users in the system with optional search filter.
    Never exposes passwords.
    """
    query = db.query(User)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter((User.name.ilike(search_filter)) | (User.email.ilike(search_filter)))
    return query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

@router.patch("/{user_id}/status", response_model=UserOut)
def toggle_user_status(
    user_id: uuid.UUID,
    status_in: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Enable or disable a user account.
    Disabled users are immediately blocked from logging in or using the API.
    """
    if admin.id == user_id and not status_in.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An administrator cannot disable their own account.",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    user.is_active = status_in.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
