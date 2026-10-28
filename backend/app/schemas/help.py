import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Literal, List

class ChecklistStatus(BaseModel):
    has_income: bool
    has_expense: bool
    has_budget: bool
    has_goal: bool
    has_viewed_analytics: bool
    completed_count: int
    total_count: int = 5
    all_completed: bool
    is_dismissed: bool

class SupportReportCreate(BaseModel):
    report_type: Literal['Something is broken', 'I have a question', 'I have a suggestion']
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10, max_length=1000)
    page: Optional[str] = Field(None, max_length=50)

class SupportReportOut(BaseModel):
    id: uuid.UUID
    report_number: Optional[int] = 101
    report_type: str
    title: str
    description: str
    page: Optional[str] = None
    status: str
    closed_reason: Optional[str] = None
    admin_reply: Optional[str] = None
    admin_reply_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserReportHistoryItem(BaseModel):
    id: str
    actor_name: str  # Always "FinTrack team" for admin actions
    event_type: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime

class UserReportDetailOut(SupportReportOut):
    history: List[UserReportHistoryItem]

class SimpleMessageResponse(BaseModel):
    message: str
    success: bool = True
