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
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    quarter: Optional[int] = Query(None, ge=1, le=4),
    half: Optional[int] = Query(None, ge=1, le=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns aggregated dashboard financial overview for the selected user and time period:
    - Supports 'monthly', 'quarterly', 'half_year', 'yearly'
    - Month-wise trend data for comparative visual bar graphs
    - Category-wise expense and income breakdown
    - Financial health score (shared formula with Analytics) and period-over-period delta %
    - Recent transactions list
    """
    today_dt = date.today()
    cur_year = year or today_dt.year
    cur_month = month or today_dt.month
    cur_quarter = quarter or ((today_dt.month - 1) // 3 + 1)
    cur_half = half or (1 if today_dt.month <= 6 else 2)

    trend_months: List[tuple[int, int]] = []  # list of (year, month)
    period_months: List[tuple[int, int]] = []

    # 1. Compute Date Range & Period Label
    if period_type == "monthly":
        m = cur_month
        y = cur_year
        start_date = date(y, m, 1)
        last_day = calendar.monthrange(y, m)[1]
        end_date = date(y, m, last_day)
        period_label = f"{MONTH_SHORT[m]} {y}"
        period_months = [(y, m)]

        # Previous month for comparisons
        prev_m = m - 1 if m > 1 else 12
        prev_y = y if m > 1 else y - 1
        prev_start = date(prev_y, prev_m, 1)
        prev_end = date(prev_y, prev_m, calendar.monthrange(prev_y, prev_m)[1])

        # Trailing 6 months ending at selected month for month-wise trend
        curr_m, curr_y = m, y
        months_back = []
        for _ in range(6):
            months_back.append((curr_y, curr_m))
            curr_m -= 1
            if curr_m < 1:
                curr_m = 12
                curr_y -= 1
        trend_months = list(reversed(months_back))

    elif period_type == "quarterly":
        q = cur_quarter
        y = cur_year
        start_m = (q - 1) * 3 + 1
        end_m = start_m + 2
        start_date = date(y, start_m, 1)
        end_date = date(y, end_m, calendar.monthrange(y, end_m)[1])
        period_label = f"Q{q} {y} ({MONTH_SHORT[start_m]} - {MONTH_SHORT[end_m]})"
        period_months = [(y, mm) for mm in range(start_m, end_m + 1)]

        # Previous quarter
        prev_q = q - 1 if q > 1 else 4
        prev_y = y if q > 1 else y - 1
        prev_start_m = (prev_q - 1) * 3 + 1
        prev_end_m = prev_start_m + 2
        prev_start = date(prev_y, prev_start_m, 1)
        prev_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])

        # All 3 months in this quarter
        trend_months = [(y, mm) for mm in range(start_m, end_m + 1)]

    elif period_type == "half_year":
        h = cur_half
        y = cur_year
        start_m = 1 if h == 1 else 7
        end_m = 6 if h == 1 else 12
        start_date = date(y, start_m, 1)
        end_date = date(y, end_m, calendar.monthrange(y, end_m)[1])
        period_label = f"H{h} {y} ({MONTH_SHORT[start_m]} - {MONTH_SHORT[end_m]})"
        period_months = [(y, mm) for mm in range(start_m, end_m + 1)]

        # Previous half
        prev_h = 2 if h == 1 else 1
        prev_y = y - 1 if h == 1 else y
        prev_start_m = 1 if prev_h == 1 else 7
        prev_end_m = 6 if prev_h == 1 else 12
        prev_start = date(prev_y, prev_start_m, 1)
        prev_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])

        # All 6 months in this half
        trend_months = [(y, mm) for mm in range(start_m, end_m + 1)]

    else:  # 'yearly'
        y = cur_year
        start_date = date(y, 1, 1)
        end_date = date(y, 12, 31)
        period_label = f"Year {y}"
        period_months = [(y, mm) for mm in range(1, 13)]

        prev_y = y - 1
        prev_start = date(prev_y, 1, 1)
        prev_end = date(prev_y, 12, 31)

        # All 12 months
        trend_months = [(y, mm) for mm in range(1, 13)]

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

    # 4. Financial Health Score (Unified Shared Engine with Analytics)
    from app.services.health_score_service import calculate_financial_health_score

    health_data = calculate_financial_health_score(
        db=db,
        user_id=current_user.id,
        period_type=period_type,
        year=cur_year,
        month=cur_month,
        start_date=start_date,
        end_date=end_date,
        period_months=period_months,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        savings_rate_pct=savings_rate,
    )

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
        year=cur_year,
        month=cur_month if period_type == "monthly" else None,
        quarter=cur_quarter if period_type == "quarterly" else None,
        half=cur_half if period_type == "half_year" else None,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=net_savings,
        savings_rate=savings_rate,
        income_change_pct=income_change_pct,
        expense_change_pct=expense_change_pct,
        savings_change_pct=savings_change_pct,
        financial_health_score=health_data.score,
        financial_health_label=health_data.status_label,
        has_enough_data=getattr(health_data, 'has_enough_data', health_data.score is not None),
        monthly_trends=monthly_trends,
        expense_breakdown=expense_breakdown,
        income_breakdown=income_breakdown,
        recent_transactions=recent_transactions,
    )
