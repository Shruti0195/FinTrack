from datetime import date
from typing import Optional, List
import uuid
from pydantic import BaseModel, Field


class HealthScoreFactor(BaseModel):
    name: str
    earned_points: float
    max_points: float
    is_calculated: bool
    user_figure_text: str
    rule_explanation: str
    not_calculated_reason: Optional[str] = None


class FinancialHealthScoreData(BaseModel):
    score: Optional[int] = None
    status_label: str  # 'Excellent', 'Good', 'Fair', 'Needs attention', 'Pending Data'
    status_color: str  # emerald / amber / red / slate
    factors_calculated_count: int
    total_factors_count: int = 4
    has_enough_data: bool = True
    score_notes: List[str]
    improvement_line: str
    missing_factor_note: Optional[str] = None
    explanation_summary: str
    factors: List[HealthScoreFactor]


class SpendingSavingTrendPoint(BaseModel):
    month: int = Field(..., ge=1, le=12)
    month_name: str
    year: int
    income: float = 0.0
    expenses: float = 0.0
    savings: float = 0.0
    savings_rate: float = 0.0


class SpendingSavingTrends(BaseModel):
    monthly_trends: List[SpendingSavingTrendPoint]
    savings_takeaway: str
    healthy_savings_range_min: float = 20.0
    healthy_savings_range_max: float = 35.0


class CategoryExpenseMix(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    amount: float
    percentage: float
    color: str
    is_essential: bool
    transaction_count: int = 0


class TopSingleExpense(BaseModel):
    id: uuid.UUID
    description: str
    category_name: str
    amount: float
    transaction_date: date


class PeriodComparisonMetric(BaseModel):
    key: str  # 'income', 'expenses', 'savings', 'savings_rate'
    label: str  # 'Total Income', 'Total Expenses', 'Net Savings', 'Savings Rate'
    current_value: float
    previous_value: float
    change_amount: float
    change_pct: Optional[float] = None
    change_label: str = ""  # e.g. "New", "+12.5%", "-8.0%"
    is_good: bool  # True if change is positive financial health (e.g. income up, expense down, savings up)
    formatted_current: str
    formatted_previous: str


class AnalyticsOverviewResponse(BaseModel):
    period_type: str  # 'monthly', 'quarterly', 'half_year', 'yearly'
    period_label: str  # e.g. "Apr 2026", "Q2 2026", "Year 2026"
    year: int
    month: Optional[int] = None
    quarter: Optional[int] = None
    half: Optional[int] = None
    has_enough_data: bool
    health_score: FinancialHealthScoreData
    trends: SpendingSavingTrends
    expense_mix: List[CategoryExpenseMix]
    top_5_categories: List[CategoryExpenseMix]
    top_5_expenses: List[TopSingleExpense]
    comparison: List[PeriodComparisonMetric]
