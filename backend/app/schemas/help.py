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
    report_type: str
    title: str
    description: str
    page: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SimpleMessageResponse(BaseModel):
    message: str
    success: bool = True
