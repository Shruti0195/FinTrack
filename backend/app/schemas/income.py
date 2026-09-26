import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class IncomeCategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    is_default: bool = True
    user_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

class CustomCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=60, description="Custom category name")


class IncomeCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Income amount must be greater than zero")
    category_id: uuid.UUID
    transaction_date: date
    description: Optional[str] = None

class IncomeUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category_id: Optional[uuid.UUID] = None
    transaction_date: Optional[date] = None
    description: Optional[str] = None

class IncomeOut(BaseModel):
    id: uuid.UUID
    amount: float
    category_id: uuid.UUID
    category_name: str
    description: Optional[str] = None
    transaction_date: date
    created_at: datetime

    class Config:
        from_attributes = True

class IncomeListResponse(BaseModel):
    items: List[IncomeOut]
    total_count: int
    total_amount: float
    page: int
    limit: int
    total_pages: int

class IncomeCategoryShare(BaseModel):
    category_id: uuid.UUID
    category_name: str
    total_amount: float
    percentage: float
    count: int

class IncomeStatsResponse(BaseModel):
    total_income_this_month: float
    total_income_last_month: float
    month_over_month_change_pct: float
    entries_count_this_month: int
    avg_income_per_entry: float
    top_source_name: Optional[str] = None
    top_source_amount: float = 0.0
    top_source_percentage: float = 0.0
    category_breakdown: List[IncomeCategoryShare] = []
