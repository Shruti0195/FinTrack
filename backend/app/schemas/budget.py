from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal

class BudgetBase(BaseModel):
    category_id: UUID
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    year: int = Field(..., ge=2000, le=2100, description="Year (e.g. 2026)")
    limit_amount: float = Field(..., gt=0, description="Monthly spending limit, must be greater than 0")

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    limit_amount: float = Field(..., gt=0, description="Updated monthly spending limit")

class BudgetResponse(BaseModel):
    id: UUID
    user_id: UUID
    category_id: UUID
    category_name: str
    type: str = "expense"
    month: int
    year: int
    limit_amount: float
    spent_amount: float = 0.0
    remaining_amount: float = 0.0
    percentage_used: float = 0.0
    status: Literal["safe", "warning", "exceeded"] = "safe"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BudgetSummaryResponse(BaseModel):
    month: int
    year: int
    total_budget: float
    total_spent: float
    total_remaining: float
    overall_percentage: float
    budget_count: int
    safe_count: int
    warning_count: int
    exceeded_count: int

class BudgetCategoryOption(BaseModel):
    id: UUID
    name: str
    type: str = "expense"

    model_config = ConfigDict(from_attributes=True)
