import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class GoalContributionCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Contribution amount must be greater than zero")
    note: Optional[str] = Field(None, max_length=200)
    contributed_at: Optional[date] = None

class GoalContributionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    note: Optional[str] = Field(None, max_length=200)
    contributed_at: Optional[date] = None

class GoalContributionOut(BaseModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    amount: float
    note: Optional[str] = None
    contributed_at: date
    created_at: datetime

    class Config:
        from_attributes = True

class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="Goal name e.g. New Phone, Goa Trip")
    target_amount: float = Field(..., gt=0, description="Target savings amount in INR")
    deadline: Optional[date] = None
    months: Optional[int] = Field(None, ge=1, le=120, description="Optional target duration in months")
    color: Optional[str] = Field("#10B981", max_length=30)
    icon: Optional[str] = Field("target", max_length=50)

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(None, gt=0)
    deadline: Optional[date] = None
    color: Optional[str] = Field(None, max_length=30)
    icon: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field(None, pattern="^(active|completed)$")

class GoalOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    target_amount: float
    saved_amount: float
    remaining_amount: float
    percentage: float
    deadline: Optional[date] = None
    days_remaining: Optional[int] = None
    suggested_monthly_savings: float = 0.0
    color: str = "#10B981"
    icon: str = "target"
    status: str = "active"
    cheering_message: str = ""
    contributions: List[GoalContributionOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GoalSummaryOut(BaseModel):
    total_goals: int
    active_goals: int
    completed_goals: int
    total_target_amount: float
    total_saved_amount: float
    overall_percentage: float
