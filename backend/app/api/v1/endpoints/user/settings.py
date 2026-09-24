from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserSettingsUpdate
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
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
