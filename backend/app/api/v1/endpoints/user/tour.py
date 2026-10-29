from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

class TourCompleteRequest(BaseModel):
    version: Optional[int] = 1

class TourStatusResponse(BaseModel):
    tour_completed_version: int
    is_completed: bool

@router.get("/status", response_model=TourStatusResponse)
def get_tour_status(current_user: User = Depends(get_current_user)):
    """
    Returns user tour completion status and version.
    """
    version = getattr(current_user, 'tour_completed_version', 0) or 0
    return TourStatusResponse(
        tour_completed_version=version,
        is_completed=version > 0
    )

@router.post("/complete")
def complete_tour(
    req: Optional[TourCompleteRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Marks tour as completed or skipped for the user.
    Once completed, the user is never forced to see the tour again.
    """
    requested_version = req.version if req and req.version else 1
    current_version = getattr(current_user, 'tour_completed_version', 0) or 0
    target_version = max(current_version, requested_version)
    
    current_user.tour_completed_version = target_version
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {
        "success": True,
        "tour_completed_version": current_user.tour_completed_version
    }
