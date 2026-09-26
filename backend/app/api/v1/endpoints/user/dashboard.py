import calendar
from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, desc, extract
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    MonthlyTrendItem,
    CategoryBreakdownItem,
    DashboardTransactionItem,
)

router = APIRouter()

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

MONTH_SHORT = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

PALETTE_COLORS = [
    "#10B981",  # Emerald Green
    "#3B82F6",  # Blue
    "#F59E0B",  # Amber
    "#8B5CF6",  # Purple
    "#EC4899",  # Pink
    "#06B6D4",  # Cyan
    "#64748B",  # Slate
    "#14B8A6",  # Teal
]


def _calc_pct_change(curr: float, prev: float) -> float:
    if prev > 0:
        return round(((curr - prev) / prev) * 100, 1)
    elif curr > 0:
        return 100.0
    return 0.0


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    period_type: str = Query("monthly", regex="^(monthly|quarterly|half_year|yearly)$"),
    year: int = Query(2026, ge=2000, le=2100),
    month: Optional[int] = Query(4, ge=1, le=12),
    quarter: Optional[int] = Query(2, ge=1, le=4),
    half: Optional[int] = Query(1, ge=1, le=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregated dashboard financial overview for the selected user and time period:
    - Supports 'monthly', 'quarterly', 'half_year', 'yearly'
    - Month-wise trend data for comparative visual bar graphs
    - Category-wise expense and income breakdown
    - Financial health score and period-over-period delta %
    - Recent transactions list
    """
    trend_months: List[tuple[int, int]] = []  # list of (year, month)

    # 1. Compute Date Range & Period Label
    if period_type == "monthly":
        m = month or 4
        start_date = date(year, m, 1)
        last_day = calendar.monthrange(year, m)[1]
        end_date = date(year, m, last_day)
        period_label = f"{MONTH_SHORT[m]} {year}"

        # Previous month for comparisons
        prev_m = m - 1 if m > 1 else 12
        prev_y = year if m > 1 else year - 1
        prev_start = date(prev_y, prev_m, 1)
        prev_end = date(prev_y, prev_m, calendar.monthrange(prev_y, prev_m)[1])

        # Trailing 6 months ending at selected month for month-wise trend
        curr_m, curr_y = m, year
        months_back = []
        for _ in range(6):
            months_back.append((curr_y, curr_m))
            curr_m -= 1
            if curr_m < 1:
                curr_m = 12
                curr_y -= 1
        trend_months = list(reversed(months_back))

    elif period_type == "quarterly":
        q = quarter or 2
        start_m = (q - 1) * 3 + 1
        end_m = start_m + 2
        start_date = date(year, start_m, 1)
        end_date = date(year, end_m, calendar.monthrange(year, end_m)[1])
        period_label = f"Q{q} {year} ({MONTH_SHORT[start_m]} - {MONTH_SHORT[end_m]})"

        # Previous quarter
        prev_q = q - 1 if q > 1 else 4
        prev_y = year if q > 1 else year - 1
        prev_start_m = (prev_q - 1) * 3 + 1
        prev_end_m = prev_start_m + 2
        prev_start = date(prev_y, prev_start_m, 1)
        prev_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])

        # All 3 months in this quarter
        trend_months = [(year, m) for m in range(start_m, end_m + 1)]

    elif period_type == "half_year":
        h = half or 1
        start_m = 1 if h == 1 else 7
        end_m = 6 if h == 1 else 12
        start_date = date(year, start_m, 1)
        end_date = date(year, end_m, calendar.monthrange(year, end_m)[1])
        period_label = f"H{h} {year} ({MONTH_SHORT[start_m]} - {MONTH_SHORT[end_m]})"

        # Previous half
        prev_h = 2 if h == 1 else 1
        prev_y = year - 1 if h == 1 else year
        prev_start_m = 1 if prev_h == 1 else 7
        prev_end_m = 6 if prev_h == 1 else 12
        prev_start = date(prev_y, prev_start_m, 1)
        prev_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])

        # All 6 months in this half
        trend_months = [(year, m) for m in range(start_m, end_m + 1)]

    else:  # 'yearly'
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        period_label = f"Year {year}"

        prev_y = year - 1
        prev_start = date(prev_y, 1, 1)
        prev_end = date(prev_y, 12, 31)

        # All 12 months
        trend_months = [(year, m) for m in range(1, 13)]

    # 2. Query Current Period Totals
    def get_totals(s_date: date, e_date: date) -> tuple[float, float]:
        res = (
            db.query(
                Transaction.type,
                func.coalesce(func.sum(Transaction.amount), 0.0).label("total")
            )
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_date >= s_date,
                Transaction.transaction_date <= e_date
            )
            .group_by(Transaction.type)
            .all()
        )
        inc = 0.0
        exp = 0.0
        for r in res:
            if r.type == "income":
                inc = float(r.total)
            elif r.type == "expense":
                exp = float(r.total)
        return inc, exp

    total_income, total_expenses = get_totals(start_date, end_date)
    net_savings = total_income - total_expenses
    savings_rate = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0

    # 3. Query Previous Period Totals for Change %
    prev_income, prev_expenses = get_totals(prev_start, prev_end)
    prev_savings = prev_income - prev_expenses

    income_change_pct = _calc_pct_change(total_income, prev_income)
    expense_change_pct = _calc_pct_change(total_expenses, prev_expenses)
    savings_change_pct = _calc_pct_change(net_savings, prev_savings)

    # 4. Financial Health Score (0 - 100)
    if total_income > 0:
        sr = (net_savings / total_income) * 100
        if sr >= 50:
            health_score = min(100, int(85 + (sr - 50) * 0.3))
            health_label = "Excellent"
        elif sr >= 25:
            health_score = int(70 + (sr - 25) * 0.6)
            health_label = "Good"
        elif sr >= 10:
            health_score = int(55 + (sr - 10) * 1.0)
            health_label = "Fair"
        elif sr >= 0:
            health_score = int(45 + sr * 1.0)
            health_label = "Needs Attention"
        else:
            health_score = max(20, int(40 + sr * 0.2))
            health_label = "Needs Attention"
    else:
        health_score = 50
        health_label = "Fair"

    # 5. Month-Wise Trends
    monthly_trends: List[MonthlyTrendItem] = []
    for y, m in trend_months:
        m_start = date(y, m, 1)
        m_end = date(y, m, calendar.monthrange(y, m)[1])
        m_inc, m_exp = get_totals(m_start, m_end)
        m_sav = m_inc - m_exp
        m_sr = round((m_sav / m_inc * 100), 1) if m_inc > 0 else 0.0
        monthly_trends.append(
            MonthlyTrendItem(
                month=m,
                month_name=MONTH_SHORT[m],
                year=y,
                income=m_inc,
                expenses=m_exp,
                savings=m_sav,
                savings_rate=m_sr,
            )
        )

    # 6. Category Breakdown for Expenses
    cat_exp_rows = (
        db.query(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.coalesce(func.sum(Transaction.amount), 0.0).label("amount"),
        )
        .join(
            Transaction,
            (Transaction.category_id == Category.id) & (Transaction.type == Category.type)
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .group_by(Category.id, Category.name)
        .order_by(desc("amount"))
        .all()
    )

    expense_breakdown: List[CategoryBreakdownItem] = []
    for idx, row in enumerate(cat_exp_rows):
        amt = float(row.amount)
        pct = round((amt / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        expense_breakdown.append(
            CategoryBreakdownItem(
                category_id=str(row.category_id),
                category_name=row.category_name,
                type="expense",
                amount=amt,
                percentage=pct,
                color=PALETTE_COLORS[idx % len(PALETTE_COLORS)],
            )
        )

    # 7. Category Breakdown for Income
    cat_inc_rows = (
        db.query(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.coalesce(func.sum(Transaction.amount), 0.0).label("amount"),
        )
        .join(
            Transaction,
            (Transaction.category_id == Category.id) & (Transaction.type == Category.type)
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .group_by(Category.id, Category.name)
        .order_by(desc("amount"))
        .all()
    )

    income_breakdown: List[CategoryBreakdownItem] = []
    for idx, row in enumerate(cat_inc_rows):
        amt = float(row.amount)
        pct = round((amt / total_income * 100), 1) if total_income > 0 else 0.0
        income_breakdown.append(
            CategoryBreakdownItem(
                category_id=str(row.category_id),
                category_name=row.category_name,
                type="income",
                amount=amt,
                percentage=pct,
                color=PALETTE_COLORS[idx % len(PALETTE_COLORS)],
            )
        )

    # 8. Recent Transactions within Period (up to 8)
    recent_rows = (
        db.query(Transaction, Category.name.label("category_name"))
        .join(
            Category,
            (Transaction.category_id == Category.id) & (Transaction.type == Category.type)
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
        )
        .order_by(desc(Transaction.transaction_date), desc(Transaction.created_at))
        .limit(8)
        .all()
    )

    recent_transactions: List[DashboardTransactionItem] = [
        DashboardTransactionItem(
            id=tx.id,
            type=tx.type,
            category_name=cat_name,
            amount=float(tx.amount),
            description=tx.description,
            payment_method=tx.payment_method,
            transaction_date=tx.transaction_date,
        )
        for tx, cat_name in recent_rows
    ]

    return DashboardOverviewResponse(
        period_type=period_type,
        period_label=period_label,
        year=year,
        month=month,
        quarter=quarter,
        half=half,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        savings_rate=savings_rate,
        income_change_pct=income_change_pct,
        expense_change_pct=expense_change_pct,
        savings_change_pct=savings_change_pct,
        financial_health_score=health_score,
        financial_health_label=health_label,
        monthly_trends=monthly_trends,
        expense_breakdown=expense_breakdown,
        income_breakdown=income_breakdown,
        recent_transactions=recent_transactions,
    )
