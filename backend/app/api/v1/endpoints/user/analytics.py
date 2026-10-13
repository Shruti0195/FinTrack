import calendar
import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.api.deps import get_current_user
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    SpendingSavingTrendPoint,
    SpendingSavingTrends,
    CategoryExpenseMix,
    TopSingleExpense,
    PeriodComparisonMetric,
)
from app.services.health_score_service import calculate_financial_health_score

router = APIRouter()

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
    "#E11D48",  # Rose
    "#6366F1",  # Indigo
]

ESSENTIAL_CATEGORIES = {"rent", "bills", "food", "healthcare", "transport", "education"}
NON_ESSENTIAL_CATEGORIES = {"shopping", "entertainment", "subscriptions"}


def _format_inr(val: float) -> str:
    sign = "-" if val < 0 else ""
    abs_v = abs(val)
    return f"{sign}₹{abs_v:,.0f}"


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    period_type: str = Query("monthly", regex="^(monthly|quarterly|half_year|yearly)$"),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    quarter: Optional[int] = Query(None, ge=1, le=4),
    half: Optional[int] = Query(None, ge=1, le=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes comprehensive analytics and Financial Health Score for FinTrack.
    Uses the unified shared health score engine.
    """
    today_dt = date.today()
    cur_year = year or today_dt.year
    cur_month = month or today_dt.month
    cur_quarter = quarter or ((today_dt.month - 1) // 3 + 1)
    cur_half = half or (1 if today_dt.month <= 6 else 2)

    # -------------------------------------------------------------
    # 1. Compute Date Range & Period Months
    # -------------------------------------------------------------
    period_months: List[tuple[int, int]] = []
    trend_months: List[tuple[int, int]] = []

    if period_type == "monthly":
        m = cur_month
        y = cur_year
        start_date = date(y, m, 1)
        last_day = calendar.monthrange(y, m)[1]
        end_date = date(y, m, last_day)
        period_label = f"{MONTH_SHORT[m]} {y}"
        period_months = [(y, m)]

        # Previous month
        prev_m = m - 1 if m > 1 else 12
        prev_y = y if m > 1 else y - 1
        prev_start = date(prev_y, prev_m, 1)
        prev_end = date(prev_y, prev_m, calendar.monthrange(prev_y, prev_m)[1])

        # Trailing 6 months ending at selected month
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

        trend_months = [(y, mm) for mm in range(1, 13)]

    # -------------------------------------------------------------
    # 2. Query Totals (Current & Previous)
    # -------------------------------------------------------------
    def get_period_totals(s_date: date, e_date: date) -> tuple[float, float, int]:
        res = (
            db.query(
                Transaction.type,
                func.coalesce(func.sum(Transaction.amount), 0.0).label("total"),
                func.count(Transaction.id).label("cnt")
            )
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_date >= s_date,
                Transaction.transaction_date <= e_date
            )
            .group_by(Transaction.type)
            .all()
        )
        inc, exp, total_count = 0.0, 0.0, 0
        for r in res:
            total_count += int(r.cnt)
            if r.type == "income":
                inc = float(r.total)
            elif r.type == "expense":
                exp = float(r.total)
        return inc, exp, total_count

    total_income, total_expenses, _ = get_period_totals(start_date, end_date)
    prev_income, prev_expenses, _ = get_period_totals(prev_start, prev_end)

    net_savings = total_income - total_expenses
    prev_savings = prev_income - prev_expenses

    savings_rate_pct = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0
    prev_savings_rate_pct = round((prev_savings / prev_income * 100), 1) if prev_income > 0 else 0.0

    # -------------------------------------------------------------
    # 3. Financial Health Score (Unified Shared Service)
    # -------------------------------------------------------------
    health_score_data = calculate_financial_health_score(
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
        savings_rate_pct=savings_rate_pct,
    )

    has_enough_data = health_score_data.score is not None

    # -------------------------------------------------------------
    # 4. Spending & Saving Monthly Trends
    # -------------------------------------------------------------
    monthly_trends: List[SpendingSavingTrendPoint] = []
    for y_val, m_val in trend_months:
        m_start = date(y_val, m_val, 1)
        m_end = date(y_val, m_val, calendar.monthrange(y_val, m_val)[1])
        m_inc, m_exp, _ = get_period_totals(m_start, m_end)
        m_sav = m_inc - m_exp
        m_sr = round((m_sav / m_inc * 100), 1) if m_inc > 0 else 0.0
        monthly_trends.append(
            SpendingSavingTrendPoint(
                month=m_val,
                month_name=MONTH_SHORT[m_val],
                year=y_val,
                income=m_inc,
                expenses=m_exp,
                savings=m_sav,
                savings_rate=m_sr,
            )
        )

    # -------------------------------------------------------------
    # 5. Requirement 5: Savings Takeaway Logic
    # "only say 'climbed steadily' if savings rose in every one of the last 3 months.
    # Otherwise use a more modest sentence, such as 'Savings rose compared with last month.'"
    # -------------------------------------------------------------
    savings_takeaway = "Monthly trend overview for the selected time horizon."
    if len(monthly_trends) >= 2:
        valid_trends = [t for t in monthly_trends if t.income > 0 or t.expenses > 0]
        if len(valid_trends) >= 2:
            last_sav = valid_trends[-1].savings
            prev_sav = valid_trends[-2].savings

            # Check if savings rose in every one of the last 3 months
            # (requires 3 consecutive increases across last 4 months, or 2 increases if only 3 months available)
            climbed_steadily = False
            if len(valid_trends) >= 4:
                climbed_steadily = (
                    valid_trends[-4].savings < valid_trends[-3].savings < valid_trends[-2].savings < valid_trends[-1].savings
                )
            elif len(valid_trends) == 3:
                climbed_steadily = (
                    valid_trends[-3].savings < valid_trends[-2].savings < valid_trends[-1].savings
                )

            if climbed_steadily and last_sav > 0:
                first_climbed_month = valid_trends[-3 if len(valid_trends) == 3 else -4].month_name
                savings_takeaway = f"Savings have climbed steadily since {first_climbed_month}."
            elif last_sav > prev_sav:
                savings_takeaway = "Savings rose compared with last month."
            elif last_sav < prev_sav:
                savings_takeaway = "Savings decreased compared with last month."
            elif last_sav == prev_sav and last_sav > 0:
                savings_takeaway = "Savings remained steady compared with last month."
            elif last_sav <= 0 and prev_sav <= 0:
                savings_takeaway = "Spending matched or exceeded income recently; aim to rebuild a monthly cushion."
            else:
                savings_takeaway = f"Savings averaged {_format_inr(sum(t.savings for t in valid_trends) / len(valid_trends))} per month."
        else:
            savings_takeaway = "Track additional months to uncover long-term savings trends."

    # Requirement 6: Healthy savings range agrees with score rule: 30% and above
    trends_data = SpendingSavingTrends(
        monthly_trends=monthly_trends,
        savings_takeaway=savings_takeaway,
        healthy_savings_range_min=30.0,
        healthy_savings_range_max=100.0,
    )

    # -------------------------------------------------------------
    # 6. Where the Money Goes (Category Mix & Top 5)
    # -------------------------------------------------------------
    cat_mix_rows = (
        db.query(
            Category.id.label("category_id"),
            Category.name.label("category_name"),
            func.coalesce(func.sum(Transaction.amount), 0.0).label("amount"),
            func.count(Transaction.id).label("cnt")
        )
        .join(Transaction, (Transaction.category_id == Category.id) & (Transaction.type == "expense"))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        )
        .group_by(Category.id, Category.name)
        .order_by(desc(func.sum(Transaction.amount)))
        .all()
    )

    expense_mix: List[CategoryExpenseMix] = []
    top_5_categories: List[CategoryExpenseMix] = []

    for i, r in enumerate(cat_mix_rows):
        c_name = r.category_name or "General"
        c_amt = float(r.amount)
        pct = round((c_amt / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        color = PALETTE_COLORS[i % len(PALETTE_COLORS)]
        is_ess = c_name.lower().strip() in ESSENTIAL_CATEGORIES

        mix_item = CategoryExpenseMix(
            category_id=str(r.category_id) if r.category_id else None,
            category_name=c_name,
            amount=c_amt,
            percentage=pct,
            color=color,
            is_essential=is_ess,
            transaction_count=int(r.cnt)
        )
        expense_mix.append(mix_item)
        if len(top_5_categories) < 5:
            top_5_categories.append(mix_item)

    # Top 5 Single Expenses
    top_single_rows = (
        db.query(
            Transaction.id,
            Transaction.description,
            Category.name.label("category_name"),
            Transaction.amount,
            Transaction.transaction_date
        )
        .join(Category, Category.id == Transaction.category_id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        )
        .order_by(desc(Transaction.amount))
        .limit(5)
        .all()
    )

    top_5_expenses: List[TopSingleExpense] = [
        TopSingleExpense(
            id=str(r.id),
            description=r.description or r.category_name or "Expense",
            category_name=r.category_name or "General",
            amount=float(r.amount),
            transaction_date=r.transaction_date.isoformat()
        )
        for r in top_single_rows
    ]

    # -------------------------------------------------------------
    # 7. Requirement 4: Period Comparison Calculation
    # "when the previous period is zero, show 'New' instead of 100%.
    # When both values are negative, calculate the change properly instead of showing 0%."
    # -------------------------------------------------------------
    def _calc_comparison_change(curr: float, prev: float, is_rate: bool = False) -> tuple[Optional[float], str]:
        if is_rate:
            diff = round(curr - prev, 1)
            if prev == 0 and curr > 0:
                return diff, "New"
            return diff, f"{diff:+.1f}%"

        if prev == 0:
            if curr != 0:
                return None, "New"
            return 0.0, "0.0%"

        # When both values are negative, or prev != 0:
        # Standard formula: (curr - prev) / abs(prev) * 100
        pct = round(((curr - prev) / abs(prev)) * 100.0, 1)
        sign = "+" if pct > 0 else ""
        return pct, f"{sign}{pct:.1f}%"

    inc_pct, inc_lbl = _calc_comparison_change(total_income, prev_income)
    exp_pct, exp_lbl = _calc_comparison_change(total_expenses, prev_expenses)
    sav_pct, sav_lbl = _calc_comparison_change(net_savings, prev_savings)
    sr_pct, sr_lbl = _calc_comparison_change(savings_rate_pct, prev_savings_rate_pct, is_rate=True)
    sr_delta = round(savings_rate_pct - prev_savings_rate_pct, 1)

    comparison: List[PeriodComparisonMetric] = [
        PeriodComparisonMetric(
            key="income",
            label="Total Income",
            current_value=total_income,
            previous_value=prev_income,
            change_amount=total_income - prev_income,
            change_pct=inc_pct,
            change_label=inc_lbl,
            is_good=(total_income >= prev_income),
            formatted_current=_format_inr(total_income),
            formatted_previous=_format_inr(prev_income),
        ),
        PeriodComparisonMetric(
            key="expenses",
            label="Total Expenses",
            current_value=total_expenses,
            previous_value=prev_expenses,
            change_amount=total_expenses - prev_expenses,
            change_pct=exp_pct,
            change_label=exp_lbl,
            is_good=(total_expenses <= prev_expenses),  # Lower expense is good!
            formatted_current=_format_inr(total_expenses),
            formatted_previous=_format_inr(prev_expenses),
        ),
        PeriodComparisonMetric(
            key="savings",
            label="Net Savings",
            current_value=net_savings,
            previous_value=prev_savings,
            change_amount=net_savings - prev_savings,
            change_pct=sav_pct,
            change_label=sav_lbl,
            is_good=(net_savings >= prev_savings),
            formatted_current=_format_inr(net_savings),
            formatted_previous=_format_inr(prev_savings),
        ),
        PeriodComparisonMetric(
            key="savings_rate",
            label="Savings Rate",
            current_value=savings_rate_pct,
            previous_value=prev_savings_rate_pct,
            change_amount=sr_delta,
            change_pct=sr_pct,
            change_label=sr_lbl,
            is_good=(savings_rate_pct >= prev_savings_rate_pct),
            formatted_current=f"{savings_rate_pct:.1f}%",
            formatted_previous=f"{prev_savings_rate_pct:.1f}%",
        ),
    ]

    return AnalyticsOverviewResponse(
        period_type=period_type,
        period_label=period_label,
        year=cur_year,
        month=cur_month if period_type == "monthly" else None,
        quarter=cur_quarter if period_type == "quarterly" else None,
        half=cur_half if period_type == "half_year" else None,
        has_enough_data=has_enough_data,
        health_score=health_score_data,
        trends=trends_data,
        expense_mix=expense_mix,
        top_5_categories=top_5_categories,
        top_5_expenses=top_5_expenses,
        comparison=comparison,
    )
