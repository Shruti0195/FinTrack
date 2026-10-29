import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.goal import Goal, GoalIcon, GoalColor
from app.api.deps import get_current_admin_user

router = APIRouter()

# =========================================================================
# SCHEMAS
# =========================================================================

class AdminGoalIconResponse(BaseModel):
    id: str
    name: str
    icon_key: str
    is_default: bool
    goal_count: int
    created_at: Optional[datetime] = None

class CreateGoalIconRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    icon_key: str = Field(..., min_length=1, max_length=50)

class UpdateGoalIconRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    icon_key: Optional[str] = Field(None, min_length=1, max_length=50)

class DeleteGoalIconRequest(BaseModel):
    target_icon_id: Optional[str] = None

class AdminGoalColorResponse(BaseModel):
    id: str
    name: str
    hex: str
    is_default: bool
    goal_count: int
    created_at: Optional[datetime] = None

class CreateGoalColorRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    hex: str = Field(..., min_length=3, max_length=10)

class UpdateGoalColorRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    hex: Optional[str] = Field(None, min_length=3, max_length=10)

class DeleteGoalColorRequest(BaseModel):
    target_color_id: Optional[str] = None


# =========================================================================
# 1. GOAL ICONS MANAGEMENT
# =========================================================================

@router.get("/icons", response_model=List[AdminGoalIconResponse])
def get_goal_icons(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Returns all available goal icons along with usage count in user goals.
    """
    icons = db.query(GoalIcon).order_by(GoalIcon.name.asc()).all()
    
    # Calculate goal count per icon_key
    goal_counts = dict(
        db.query(Goal.icon, func.count(Goal.id))
        .group_by(Goal.icon)
        .all()
    )

    results = []
    for icon in icons:
        results.append(
            AdminGoalIconResponse(
                id=str(icon.id),
                name=icon.name,
                icon_key=icon.icon_key,
                is_default=icon.is_default,
                goal_count=goal_counts.get(icon.icon_key, 0),
                created_at=icon.created_at
            )
        )
    return results


@router.post("/icons", response_model=AdminGoalIconResponse, status_code=status.HTTP_201_CREATED)
def create_goal_icon(
    data: CreateGoalIconRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Add a new goal icon. Names and icon keys must be unique.
    """
    clean_name = data.name.strip()
    clean_key = data.icon_key.strip().lower()

    if not clean_name or not clean_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Icon name and icon identifier cannot be empty."
        )

    # Check case-insensitive uniqueness
    existing_name = db.query(GoalIcon).filter(func.lower(GoalIcon.name) == clean_name.lower()).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A goal icon with name '{clean_name}' already exists."
        )

    existing_key = db.query(GoalIcon).filter(func.lower(GoalIcon.icon_key) == clean_key).first()
    if existing_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A goal icon with identifier '{clean_key}' already exists."
        )

    new_icon = GoalIcon(
        id=uuid.uuid4(),
        name=clean_name,
        icon_key=clean_key,
        is_default=False
    )
    db.add(new_icon)
    db.commit()
    db.refresh(new_icon)

    return AdminGoalIconResponse(
        id=str(new_icon.id),
        name=new_icon.name,
        icon_key=new_icon.icon_key,
        is_default=new_icon.is_default,
        goal_count=0,
        created_at=new_icon.created_at
    )


@router.put("/icons/{icon_id}", response_model=AdminGoalIconResponse)
def update_goal_icon(
    icon_id: str,
    data: UpdateGoalIconRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Rename or update a goal icon.
    """
    try:
        icon_uuid = uuid.UUID(icon_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid icon ID format.")

    icon = db.query(GoalIcon).filter(GoalIcon.id == icon_uuid).first()
    if not icon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal icon not found.")

    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Icon name cannot be empty.")

    # Name uniqueness check
    conflict_name = db.query(GoalIcon).filter(
        func.lower(GoalIcon.name) == clean_name.lower(),
        GoalIcon.id != icon_uuid
    ).first()
    if conflict_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Another goal icon with name '{clean_name}' already exists."
        )

    old_key = icon.icon_key
    clean_key = data.icon_key.strip().lower() if data.icon_key else None
    if clean_key and clean_key != old_key:
        conflict_key = db.query(GoalIcon).filter(
            func.lower(GoalIcon.icon_key) == clean_key,
            GoalIcon.id != icon_uuid
        ).first()
        if conflict_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another goal icon with identifier '{clean_key}' already exists."
            )
        icon.icon_key = clean_key

        # Update existing goals using the old key to the new key
        db.query(Goal).filter(Goal.icon == old_key).update({"icon": clean_key}, synchronize_session=False)

    icon.name = clean_name
    db.add(icon)
    db.commit()
    db.refresh(icon)

    count = db.query(Goal).filter(Goal.icon == icon.icon_key).count()

    return AdminGoalIconResponse(
        id=str(icon.id),
        name=icon.name,
        icon_key=icon.icon_key,
        is_default=icon.is_default,
        goal_count=count,
        created_at=icon.created_at
    )


@router.delete("/icons/{icon_id}")
def delete_goal_icon(
    icon_id: str,
    data: Optional[DeleteGoalIconRequest] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Safely delete a goal icon.
    If existing goals use this icon, requires target_icon_id to reassign them without losing user goal icons.
    """
    try:
        icon_uuid = uuid.UUID(icon_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid icon ID format.")

    icon = db.query(GoalIcon).filter(GoalIcon.id == icon_uuid).first()
    if not icon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal icon not found.")

    affected_count = db.query(Goal).filter(Goal.icon == icon.icon_key).count()

    if affected_count > 0:
        if not data or not data.target_icon_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete icon '{icon.name}'. It is currently used in {affected_count} user goal(s). Please choose another icon to move them to."
            )

        try:
            target_uuid = uuid.UUID(data.target_icon_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target icon ID.")

        if target_uuid == icon_uuid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reassign goals to the icon being deleted.")

        target_icon = db.query(GoalIcon).filter(GoalIcon.id == target_uuid).first()
        if not target_icon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target replacement icon not found.")

        # Reassign existing goals
        db.query(Goal).filter(Goal.icon == icon.icon_key).update(
            {"icon": target_icon.icon_key},
            synchronize_session=False
        )

    db.delete(icon)
    db.commit()

    return {
        "success": True,
        "message": f"Goal icon '{icon.name}' deleted successfully.",
        "reassigned_goals": affected_count
    }


# =========================================================================
# 2. GOAL COLOR TAGS MANAGEMENT
# =========================================================================

@router.get("/colors", response_model=List[AdminGoalColorResponse])
def get_goal_colors(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Returns all available goal color tags along with usage count in user goals.
    """
    colors = db.query(GoalColor).order_by(GoalColor.name.asc()).all()

    # Calculate goal count per hex code (case-insensitive)
    goal_counts = dict(
        db.query(func.lower(Goal.color), func.count(Goal.id))
        .group_by(func.lower(Goal.color))
        .all()
    )

    results = []
    for color in colors:
        results.append(
            AdminGoalColorResponse(
                id=str(color.id),
                name=color.name,
                hex=color.hex,
                is_default=color.is_default,
                goal_count=goal_counts.get(color.hex.lower(), 0),
                created_at=color.created_at
            )
        )
    return results


@router.post("/colors", response_model=AdminGoalColorResponse, status_code=status.HTTP_201_CREATED)
def create_goal_color(
    data: CreateGoalColorRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Add a new goal color tag. Name and Hex must be unique.
    """
    clean_name = data.name.strip()
    clean_hex = data.hex.strip().upper()
    if not clean_hex.startswith('#'):
        clean_hex = '#' + clean_hex

    if not clean_name or len(clean_hex) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Color name and valid hex code (e.g. #10B981) are required."
        )

    # Check case-insensitive uniqueness
    existing_name = db.query(GoalColor).filter(func.lower(GoalColor.name) == clean_name.lower()).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A color tag with name '{clean_name}' already exists."
        )

    existing_hex = db.query(GoalColor).filter(func.upper(GoalColor.hex) == clean_hex).first()
    if existing_hex:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A color tag with hex code '{clean_hex}' already exists."
        )

    new_color = GoalColor(
        id=uuid.uuid4(),
        name=clean_name,
        hex=clean_hex,
        is_default=False
    )
    db.add(new_color)
    db.commit()
    db.refresh(new_color)

    return AdminGoalColorResponse(
        id=str(new_color.id),
        name=new_color.name,
        hex=new_color.hex,
        is_default=new_color.is_default,
        goal_count=0,
        created_at=new_color.created_at
    )


@router.put("/colors/{color_id}", response_model=AdminGoalColorResponse)
def update_goal_color(
    color_id: str,
    data: UpdateGoalColorRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Rename or update a goal color tag.
    """
    try:
        color_uuid = uuid.UUID(color_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid color ID format.")

    color = db.query(GoalColor).filter(GoalColor.id == color_uuid).first()
    if not color:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal color not found.")

    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Color name cannot be empty.")

    # Name uniqueness check
    conflict_name = db.query(GoalColor).filter(
        func.lower(GoalColor.name) == clean_name.lower(),
        GoalColor.id != color_uuid
    ).first()
    if conflict_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Another color tag with name '{clean_name}' already exists."
        )

    old_hex = color.hex.upper()
    clean_hex = data.hex.strip().upper() if data.hex else None
    if clean_hex:
        if not clean_hex.startswith('#'):
            clean_hex = '#' + clean_hex
        if clean_hex != old_hex:
            conflict_hex = db.query(GoalColor).filter(
                func.upper(GoalColor.hex) == clean_hex,
                GoalColor.id != color_uuid
            ).first()
            if conflict_hex:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Another color tag with hex code '{clean_hex}' already exists."
                )
            color.hex = clean_hex

            # Update existing goals using old hex code to new hex code
            db.query(Goal).filter(func.upper(Goal.color) == old_hex).update(
                {"color": clean_hex},
                synchronize_session=False
            )

    color.name = clean_name
    db.add(color)
    db.commit()
    db.refresh(color)

    count = db.query(Goal).filter(func.upper(Goal.color) == color.hex.upper()).count()

    return AdminGoalColorResponse(
        id=str(color.id),
        name=color.name,
        hex=color.hex,
        is_default=color.is_default,
        goal_count=count,
        created_at=color.created_at
    )


@router.delete("/colors/{color_id}")
def delete_goal_color(
    color_id: str,
    data: Optional[DeleteGoalColorRequest] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Safely delete a goal color tag.
    If existing goals use this color, requires target_color_id to reassign them without losing user goal styling.
    """
    try:
        color_uuid = uuid.UUID(color_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid color ID format.")

    color = db.query(GoalColor).filter(GoalColor.id == color_uuid).first()
    if not color:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal color not found.")

    affected_count = db.query(Goal).filter(func.upper(Goal.color) == color.hex.upper()).count()

    if affected_count > 0:
        if not data or not data.target_color_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete color '{color.name}'. It is currently used in {affected_count} user goal(s). Please choose another color tag to move them to."
            )

        try:
            target_uuid = uuid.UUID(data.target_color_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target color ID.")

        if target_uuid == color_uuid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reassign goals to the color being deleted.")

        target_color = db.query(GoalColor).filter(GoalColor.id == target_uuid).first()
        if not target_color:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target replacement color not found.")

        # Reassign existing goals
        db.query(Goal).filter(func.upper(Goal.color) == color.hex.upper()).update(
            {"color": target_color.hex},
            synchronize_session=False
        )

    db.delete(color)
    db.commit()

    return {
        "success": True,
        "message": f"Goal color '{color.name}' deleted successfully.",
        "reassigned_goals": affected_count
    }
