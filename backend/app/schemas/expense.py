import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ExpenseCategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str

    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Expense amount must be greater than zero")
    category_id: uuid.UUID
    transaction_date: date
    description: Optional[str] = None
    payment_method: Optional[str] = "UPI"

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category_id: Optional[uuid.UUID] = None
    transaction_date: Optional[date] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None

class ExpenseOut(BaseModel):
    id: uuid.UUID
    amount: float
    category_id: uuid.UUID
    category_name: str
    description: Optional[str] = None
    payment_method: Optional[str] = "UPI"
    transaction_date: date
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseListResponse(BaseModel):
    items: List[ExpenseOut]
    total_count: int
    total_amount: float
    page: int
    limit: int
    total_pages: int

class ExpenseCategoryShare(BaseModel):
    category_id: uuid.UUID
    category_name: str
    total_amount: float
    percentage: float
    count: int

class ExpenseStatsResponse(BaseModel):
    total_expense_this_month: float
    total_expense_last_month: float
    month_over_month_change_pct: float
    entries_count_this_month: int
    avg_expense_per_entry: float
    top_category_name: Optional[str] = None
    top_category_amount: float = 0.0
    top_category_percentage: float = 0.0
    category_breakdown: List[ExpenseCategoryShare] = []
