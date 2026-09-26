from datetime import date
from typing import Optional, List
import uuid
from pydantic import BaseModel, Field

class MonthlyTrendItem(BaseModel):
    month: int = Field(..., ge=1, le=12)
    month_name: str
    year: int
    income: float = 0.0
    expenses: float = 0.0
    savings: float = 0.0
    savings_rate: float = 0.0

class CategoryBreakdownItem(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    type: str  # 'expense' or 'income'
    amount: float
    percentage: float
    color: Optional[str] = None

class DashboardTransactionItem(BaseModel):
    id: uuid.UUID
    type: str  # 'income' or 'expense'
    category_name: str
    amount: float
    description: Optional[str] = None
    payment_method: Optional[str] = None
    transaction_date: date

class DashboardOverviewResponse(BaseModel):
    period_type: str  # 'monthly', 'quarterly', 'half_year', 'yearly'
    period_label: str  # e.g. "Apr 2026", "Q2 2026 (Apr - Jun)", "H1 2026", "Year 2026"
    year: int
    month: Optional[int] = None
    quarter: Optional[int] = None
    half: Optional[int] = None
    
    # Summary KPIs
    total_income: float
    total_expenses: float
    net_savings: float
    savings_rate: float
    
    # Comparisons vs previous period
    income_change_pct: float
    expense_change_pct: float
    savings_change_pct: float
    
    # Financial Health
    financial_health_score: int
    financial_health_label: str
    
    # Month-wise breakdown data
    monthly_trends: List[MonthlyTrendItem]
    
    # Category Breakdown & Recent Transactions
    expense_breakdown: List[CategoryBreakdownItem]
    income_breakdown: List[CategoryBreakdownItem]
    recent_transactions: List[DashboardTransactionItem]
