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
from app.models.budget import Budget
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    FinancialHealthScoreData,
    HealthScoreFactor,
    SpendingSavingTrends,
    SpendingSavingTrendPoint,
    CategoryExpenseMix,
    TopSingleExpense,
    PeriodComparisonMetric,
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
    year: int = Query(2026, ge=2000, le=2100),
    month: Optional[int] = Query(4, ge=1, le=12),
    quarter: Optional[int] = Query(2, ge=1, le=4),
    half: Optional[int] = Query(1, ge=1, le=2),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Computes comprehensive analytics and Financial Health Score for FinTrack:
    1. Financial Health Score (35 pts savings rate, 30 pts budget adherence, 20 pts expense stability, 15 pts essential mix)
    2. Spending & saving trends over time with takeaway and shaded healthy zone
    3. Category mix, top 5 categories, and top 5 single expenses
    4. Current period vs previous period comparison
    """
    # -------------------------------------------------------------
    # 1. Compute Date Range & Period Months
    # -------------------------------------------------------------
    period_months: List[tuple[int, int]] = []  # list of (year, month) in current period
    trend_months: List[tuple[int, int]] = []   # list of (year, month) for trend chart

    if period_type == "monthly":
        m = month or 4
        start_date = date(year, m, 1)
        last_day = calendar.monthrange(year, m)[1]
        end_date = date(year, m, last_day)
        period_label = f"{MONTH_SHORT[m]} {year}"
        period_months = [(year, m)]

        # Previous month for comparisons
        prev_m = m - 1 if m > 1 else 12
        prev_y = year if m > 1 else year - 1
        prev_start = date(prev_y, prev_m, 1)
        prev_end = date(prev_y, prev_m, calendar.monthrange(prev_y, prev_m)[1])

        # Trailing 6 months ending at selected month
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
        period_months = [(year, mm) for mm in range(start_m, end_m + 1)]

        # Previous quarter
        prev_q = q - 1 if q > 1 else 4
        prev_y = year if q > 1 else year - 1
        prev_start_m = (prev_q - 1) * 3 + 1
        prev_end_m = prev_start_m + 2
        prev_start = date(prev_y, prev_start_m, 1)
        prev_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])

        # Trailing 6 months or all months in quarter
        curr_m, curr_y = end_m, year
        months_back = []
        for _ in range(6):
            months_back.append((curr_y, curr_m))
            curr_m -= 1
            if curr_m < 1:
                curr_m = 12
                curr_y -= 1
        trend_months = list(reversed(months_back))

    elif period_type == "half_year":
        h = half or 1
        start_m = 1 if h == 1 else 7
        end_m = 6 if h == 1 else 12
        start_date = date(year, start_m, 1)
        end_date = date(year, end_m, calendar.monthrange(year, end_m)[1])
        period_label = f"H{h} {year} ({MONTH_SHORT[start_m]} - {MONTH_SHORT[end_m]})"
        period_months = [(year, mm) for mm in range(start_m, end_m + 1)]

        # Previous half
        prev_h = 2 if h == 1 else 1
        prev_y = year - 1 if h == 1 else year
        prev_start_m = 1 if prev_h == 1 else 7
        prev_end_m = 6 if prev_h == 1 else 12
        prev_start = date(prev_y, prev_start_m, 1)
        prev_end = date(prev_y, prev_end_m, calendar.monthrange(prev_y, prev_end_m)[1])

        trend_months = [(year, mm) for mm in range(start_m, end_m + 1)]

    else:  # 'yearly'
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        period_label = f"Year {year}"
        period_months = [(year, mm) for mm in range(1, 13)]

        prev_y = year - 1
        prev_start = date(prev_y, 1, 1)
        prev_end = date(prev_y, 12, 31)

        trend_months = [(year, mm) for mm in range(1, 13)]

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

    total_income, total_expenses, curr_tx_count = get_period_totals(start_date, end_date)
    prev_income, prev_expenses, prev_tx_count = get_period_totals(prev_start, prev_end)

    net_savings = total_income - total_expenses
    prev_savings = prev_income - prev_expenses

    savings_rate_pct = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0
    prev_savings_rate_pct = round((prev_savings / prev_income * 100), 1) if prev_income > 0 else 0.0

    # User transaction history check
    total_lifetime_tx = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == current_user.id)
        .scalar() or 0
    )
    has_enough_data = total_lifetime_tx > 0 and (total_income > 0 or total_expenses > 0)

    # -------------------------------------------------------------
    # 3. Factor 1: Savings Rate (35 points)
    # -------------------------------------------------------------
    # Savings rate = (income - expenses) / income.
    # Points = 35 * (savings rate / 30%), capped at 35. >=30% = 35. <=0% = 0.
    factor1_name = "Savings Rate"
    factor1_max = 35.0
    factor1_rule = "Full 35 points at a savings rate of 30% or more. Scores scale smoothly from 0 to 35 for positive savings rates."
    
    if total_income > 0:
        factor1_calc = True
        sr_ratio = net_savings / total_income
        if sr_ratio >= 0.30:
            factor1_pts = 35.0
        elif sr_ratio <= 0.0:
            factor1_pts = 0.0
        else:
            factor1_pts = round(35.0 * (sr_ratio / 0.30), 1)
        factor1_user_fig = f"Your savings rate is {savings_rate_pct:.1f}%, earning {factor1_pts:.1f} of 35 points"
        factor1_reason = None
    elif total_expenses > 0:
        factor1_calc = True
        factor1_pts = 0.0
        factor1_user_fig = "No income logged with expenses present (0% savings rate)"
        factor1_reason = None
    else:
        factor1_calc = False
        factor1_pts = 0.0
        factor1_user_fig = "No income or expense entries logged in this period"
        factor1_reason = "Add income entries for this period to calculate your savings rate."

    # -------------------------------------------------------------
    # 4. Factor 2: Budget Adherence (30 points)
    # -------------------------------------------------------------
    # Spent within limit = 1.0, up to 10% over = 0.5, >10% over = 0.0.
    # Points = 30 * avg_credit.
    factor2_name = "Budget Adherence"
    factor2_max = 30.0
    factor2_rule = "Full credit within budget limit, half credit up to 10% over, no credit if over 10%. Points average across all budgets."

    # Find budgets matching the current period's year and months
    budgets_query = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.year == year
    )
    if period_type == "monthly":
        budgets_query = budgets_query.filter(Budget.month == (month or 4))
    else:
        m_list = [pm[1] for pm in period_months]
        budgets_query = budgets_query.filter(Budget.month.in_(m_list))

    user_budgets = budgets_query.all()

    if not user_budgets:
        factor2_calc = False
        factor2_pts = 0.0
        factor2_user_fig = "No category budgets set for this period"
        factor2_reason = "Set category budgets to include budget adherence in your score."
        within_budget_count = 0
        total_budget_count = 0
    else:
        factor2_calc = True
        credits = []
        within_budget_count = 0
        total_budget_count = len(user_budgets)

        for b in user_budgets:
            # Query actual spent in this category for this budget's specific month & year
            b_spent = float(db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.category_id == b.category_id,
                extract("year", Transaction.transaction_date) == b.year,
                extract("month", Transaction.transaction_date) == b.month
            ).scalar() or 0.0)

            b_limit = float(b.limit_amount)
            if b_limit <= 0:
                continue

            if b_spent <= b_limit:
                credits.append(1.0)
                within_budget_count += 1
            elif b_spent <= b_limit * 1.10:
                credits.append(0.5)
            else:
                credits.append(0.0)

        if credits:
            avg_credit = sum(credits) / len(credits)
            factor2_pts = round(30.0 * avg_credit, 1)
            factor2_user_fig = f"Maintained {within_budget_count} of {total_budget_count} budgets within limit ({avg_credit * 100:.0f}% adherence)"
        else:
            factor2_pts = 30.0
            factor2_user_fig = "All budget limits respected"
        factor2_reason = None

    # -------------------------------------------------------------
    # 5. Factor 3: Expense Stability (20 points)
    # -------------------------------------------------------------
    # Compare this period's average monthly expenses with average of previous 3 months.
    # An increase of 10% or less earns full 20 pts. Falls steadily to 0 at 50% increase. Decrease never loses points.
    # Needs at least 2 earlier months of data.
    factor3_name = "Expense Stability"
    factor3_max = 20.0
    factor3_rule = "Full 20 points for an expense increase of 10% or less. Points decline to 0 at a 50% increase. Decreases earn full points."

    # Look back 3 calendar months preceding start_date
    prior_3_months = []
    py, pm = start_date.year, start_date.month
    for _ in range(3):
        pm -= 1
        if pm < 1:
            pm = 12
            py -= 1
        prior_3_months.append((py, pm))

    prior_monthly_expenses = []
    for py, pm in prior_3_months:
        p_start = date(py, pm, 1)
        p_end = date(py, pm, calendar.monthrange(py, pm)[1])
        m_exp = float(db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= p_start,
            Transaction.transaction_date <= p_end
        ).scalar() or 0.0)
        # Check if user had transactions in this month
        m_count = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= p_start,
            Transaction.transaction_date <= p_end
        ).scalar() or 0
        if m_count > 0:
            prior_monthly_expenses.append(m_exp)

    if len(prior_monthly_expenses) < 2:
        factor3_calc = False
        factor3_pts = 0.0
        factor3_user_fig = f"Only {len(prior_monthly_expenses)} earlier month of history available"
        factor3_reason = "Requires at least 2 earlier months of expense entries to assess stability."
    else:
        factor3_calc = True
        prior_avg_exp = sum(prior_monthly_expenses) / len(prior_monthly_expenses)
        num_m = len(period_months)
        curr_avg_exp = total_expenses / num_m if num_m > 0 else total_expenses

        if prior_avg_exp <= 0:
            pct_exp_increase = 0.0 if curr_avg_exp == 0 else 100.0
        else:
            pct_exp_increase = ((curr_avg_exp - prior_avg_exp) / prior_avg_exp) * 100.0

        if pct_exp_increase <= 10.0:
            factor3_pts = 20.0
        elif pct_exp_increase >= 50.0:
            factor3_pts = 0.0
        else:
            factor3_pts = round(20.0 * ((50.0 - pct_exp_increase) / 40.0), 1)

        if pct_exp_increase <= 0:
            factor3_user_fig = f"Monthly spending decreased by {abs(pct_exp_increase):.1f}% vs prior average of ₹{prior_avg_exp:,.0f}"
        else:
            factor3_user_fig = f"Monthly spending increased by {pct_exp_increase:.1f}% vs prior average of ₹{prior_avg_exp:,.0f}"
        factor3_reason = None

    # -------------------------------------------------------------
    # 6. Factor 4: Essential vs Non-Essential Spending (15 points)
    # -------------------------------------------------------------
    # Non-essential share = (Shopping + Entertainment + Subscriptions) / (essential + non_essential)
    # Share <= 30% = 15 pts. Falls steadily to 0 at 60% share.
    factor4_name = "Essential vs Lifestyle"
    factor4_max = 15.0
    factor4_rule = "Full 15 points if non-essentials (Shopping, Entertainment, Subscriptions) are 30% or less of spending. Drops to 0 at 60%."

    cat_rows = (
        db.query(
            Category.name.label("name"),
            func.coalesce(func.sum(Transaction.amount), 0.0).label("amount")
        )
        .join(Transaction, (Transaction.category_id == Category.id) & (Transaction.type == "expense"))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        )
        .group_by(Category.name)
        .all()
    )

    essential_total = 0.0
    non_essential_total = 0.0
    shopping_exp_amount = 0.0

    for r in cat_rows:
        c_name = (r.name or "").lower().strip()
        c_amt = float(r.amount)
        if c_name in NON_ESSENTIAL_CATEGORIES:
            non_essential_total += c_amt
            if "shopping" in c_name:
                shopping_exp_amount += c_amt
        elif c_name in ESSENTIAL_CATEGORIES:
            essential_total += c_amt

    relevant_expenses = essential_total + non_essential_total

    if relevant_expenses <= 0:
        if total_expenses <= 0:
            factor4_calc = False
            factor4_pts = 0.0
            factor4_user_fig = "No expenses recorded in essential or lifestyle categories"
            factor4_reason = "Log daily expenses to evaluate essential vs lifestyle spending balance."
        else:
            factor4_calc = True
            factor4_pts = 15.0
            factor4_user_fig = "Non-essential share: 0.0% of tracked categories"
            factor4_reason = None
    else:
        factor4_calc = True
        non_ess_share_pct = (non_essential_total / relevant_expenses) * 100.0
        if non_ess_share_pct <= 30.0:
            factor4_pts = 15.0
        elif non_ess_share_pct >= 60.0:
            factor4_pts = 0.0
        else:
            factor4_pts = round(15.0 * ((60.0 - non_ess_share_pct) / 30.0), 1)
        factor4_user_fig = f"Lifestyle share: {non_ess_share_pct:.1f}% (₹{non_essential_total:,.0f} of ₹{relevant_expenses:,.0f})"
        factor4_reason = None

    # -------------------------------------------------------------
    # 7. Aggregate Score & Status
    # -------------------------------------------------------------
    factors_list: List[HealthScoreFactor] = [
        HealthScoreFactor(
            name=factor1_name,
            earned_points=factor1_pts,
            max_points=factor1_max,
            is_calculated=factor1_calc,
            user_figure_text=factor1_user_fig,
            rule_explanation=factor1_rule,
            not_calculated_reason=factor1_reason,
        ),
        HealthScoreFactor(
            name=factor2_name,
            earned_points=factor2_pts,
            max_points=factor2_max,
            is_calculated=factor2_calc,
            user_figure_text=factor2_user_fig,
            rule_explanation=factor2_rule,
            not_calculated_reason=factor2_reason,
        ),
        HealthScoreFactor(
            name=factor3_name,
            earned_points=factor3_pts,
            max_points=factor3_max,
            is_calculated=factor3_calc,
            user_figure_text=factor3_user_fig,
            rule_explanation=factor3_rule,
            not_calculated_reason=factor3_reason,
        ),
        HealthScoreFactor(
            name=factor4_name,
            earned_points=factor4_pts,
            max_points=factor4_max,
            is_calculated=factor4_calc,
            user_figure_text=factor4_user_fig,
            rule_explanation=factor4_rule,
            not_calculated_reason=factor4_reason,
        ),
    ]

    calc_factors = [f for f in factors_list if f.is_calculated]

    if not has_enough_data or len(calc_factors) == 0:
        final_score = None
        status_label = "Pending Data"
        status_color = "#64748B"
        score_notes = [
            "Add a few more weeks of income and expenses to unlock your Financial Health Score.",
            "FinTrack evaluates your savings rate, budget discipline, and spending stability."
        ]
        improvement_line = "Begin by adding recurring income and regular expenses for this month."
        missing_factor_note = "Need entries for this period to calculate your score."
    else:
        earned_sum = sum(f.earned_points for f in calc_factors)
        max_sum = sum(f.max_points for f in calc_factors)
        final_score = min(100, max(0, int(round((earned_sum / max_sum) * 100.0))))

        if final_score >= 80:
            status_label = "Excellent"
            status_color = "#10B981"  # Emerald
        elif final_score >= 60:
            status_label = "Good"
            status_color = "#10B981"  # Emerald / Mint
        elif final_score >= 40:
            status_label = "Fair"
            status_color = "#F59E0B"  # Amber
        else:
            status_label = "Needs attention"
            status_color = "#EF4444"  # Red

        # Notes under score
        score_notes = []
        if total_income > 0:
            if savings_rate_pct >= 20:
                score_notes.append(f"You saved {savings_rate_pct:.0f}% of your income this period.")
            elif savings_rate_pct > 0:
                score_notes.append(f"You achieved a positive savings rate of {savings_rate_pct:.0f}%.")
            else:
                score_notes.append("Expenses exceeded income in this period.")

        if factor2_calc and user_budgets:
            score_notes.append(f"You stayed within limit on {within_budget_count} of {total_budget_count} budgets.")

        if factor4_calc and relevant_expenses > 0:
            non_ess_pct = (non_essential_total / relevant_expenses) * 100.0
            if non_ess_pct <= 30:
                score_notes.append("Lifestyle and shopping spending stayed well below 30%.")
            else:
                score_notes.append(f"Lifestyle spending accounted for {non_ess_pct:.0f}% of expenses.")

        if not score_notes:
            score_notes.append("Financial health is calculated from your verified entries.")

        # Missing factor note
        if len(calc_factors) < 4:
            missing_names = [f.name for f in factors_list if not f.is_calculated]
            if "Budget Adherence" in missing_names:
                missing_factor_note = f"Based on {len(calc_factors)} of 4 factors. Set category budgets to include budget adherence."
            elif "Expense Stability" in missing_names:
                missing_factor_note = f"Based on {len(calc_factors)} of 4 factors. Add earlier months of history to unlock expense stability."
            else:
                missing_factor_note = f"Based on {len(calc_factors)} of 4 factors."
        else:
            missing_factor_note = "Score based on all 4 financial health factors."

        # Gentle improvement line (factor that lost the most scaled points)
        points_lost = {}
        for f in factors_list:
            if f.is_calculated:
                loss = f.max_points - f.earned_points
                points_lost[f.name] = loss
            else:
                points_lost[f.name] = f.max_points * 0.7

        biggest_opportunity = max(points_lost, key=points_lost.get) if points_lost else factor1_name
        if biggest_opportunity == factor1_name:
            improvement_line = "Boosting your savings rate towards 30% will give the biggest lift to your overall score."
        elif biggest_opportunity == factor2_name:
            improvement_line = "Keeping every category within its budget limit will improve your adherence score fastest."
        elif biggest_opportunity == factor3_name:
            improvement_line = "Smoothing out month-to-month expense swings will strengthen your expense stability score."
        else:
            improvement_line = "Trimming lifestyle and shopping expenses to under 30% will quickly lift your score."

    explanation_summary = (
        "Your score combines 4 factors: Savings Rate (35 pts), Budget Adherence (30 pts), "
        "Expense Stability (20 pts), and Essential vs Lifestyle Spending (15 pts). "
        "Status: 80–100 Excellent, 60–79 Good, 40–59 Fair, <40 Needs attention. "
        "Every number comes directly from your real entries."
    )

    health_score_data = FinancialHealthScoreData(
        score=final_score,
        status_label=status_label,
        status_color=status_color,
        factors_calculated_count=len(calc_factors),
        total_factors_count=4,
        score_notes=score_notes[:3],
        improvement_line=improvement_line,
        missing_factor_note=missing_factor_note,
        explanation_summary=explanation_summary,
        factors=factors_list,
    )

    # -------------------------------------------------------------
    # 8. Spending and Saving Trends
    # -------------------------------------------------------------
    monthly_trends: List[SpendingSavingTrendPoint] = []
    for y, m in trend_months:
        m_start = date(y, m, 1)
        m_end = date(y, m, calendar.monthrange(y, m)[1])
        m_inc, m_exp, _ = get_period_totals(m_start, m_end)
        m_sav = m_inc - m_exp
        m_sr = round((m_sav / m_inc * 100), 1) if m_inc > 0 else 0.0
        monthly_trends.append(
            SpendingSavingTrendPoint(
                month=m,
                month_name=MONTH_SHORT[m],
                year=y,
                income=m_inc,
                expenses=m_exp,
                savings=m_sav,
                savings_rate=m_sr,
            )
        )

    # Compute one-line takeaway
    if len(monthly_trends) >= 2:
        valid_trends = [t for t in monthly_trends if t.income > 0 or t.expenses > 0]
        if len(valid_trends) >= 2:
            last_sav = valid_trends[-1].savings
            prev_sav = valid_trends[-2].savings
            if last_sav > prev_sav and last_sav > 0:
                first_m_name = valid_trends[0].month_name
                savings_takeaway = f"Savings have climbed steadily since {first_m_name}."
            elif last_sav > 0 and prev_sav > 0:
                savings_takeaway = f"Net savings remained positive across recent months."
            elif last_sav <= 0 and prev_sav <= 0:
                savings_takeaway = "Spending matched or exceeded income recently; aim to rebuild a monthly cushion."
            else:
                savings_takeaway = f"Savings averaged {_format_inr(sum(t.savings for t in valid_trends) / len(valid_trends))} per month."
        else:
            savings_takeaway = "Track additional months to uncover long-term savings trends."
    else:
        savings_takeaway = "Monthly trend overview for the selected time horizon."

    trends_data = SpendingSavingTrends(
        monthly_trends=monthly_trends,
        savings_takeaway=savings_takeaway,
        healthy_savings_range_min=20.0,
        healthy_savings_range_max=35.0,
    )

    # -------------------------------------------------------------
    # 9. Where the Money Goes (Category Mix & Top 5)
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
        .order_by(desc("amount"))
        .all()
    )

    expense_mix: List[CategoryExpenseMix] = []
    for idx, r in enumerate(cat_mix_rows):
        amt = float(r.amount)
        pct = round((amt / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        c_name = r.category_name or "General"
        is_ess = c_name.lower().strip() in ESSENTIAL_CATEGORIES
        color = PALETTE_COLORS[idx % len(PALETTE_COLORS)]
        expense_mix.append(
            CategoryExpenseMix(
                category_id=str(r.category_id) if r.category_id else None,
                category_name=c_name,
                amount=amt,
                percentage=pct,
                color=color,
                is_essential=is_ess,
                transaction_count=int(r.cnt)
            )
        )

    top_5_categories = expense_mix[:5]

    # Top 5 single expenses
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
            id=r.id,
            description=r.description or r.category_name or "Expense",
            category_name=r.category_name or "General",
            amount=float(r.amount),
            transaction_date=r.transaction_date
        )
        for r in top_single_rows
    ]

    # -------------------------------------------------------------
    # 10. This Period vs Previous Period Comparison Table
    # -------------------------------------------------------------
    def _pct_delta(curr: float, prev: float) -> float:
        if prev > 0:
            return round(((curr - prev) / prev) * 100.0, 1)
        elif curr > 0:
            return 100.0
        return 0.0

    inc_delta_pct = _pct_delta(total_income, prev_income)
    exp_delta_pct = _pct_delta(total_expenses, prev_expenses)
    sav_delta_pct = _pct_delta(net_savings, prev_savings)
    sr_delta = round(savings_rate_pct - prev_savings_rate_pct, 1)

    comparison: List[PeriodComparisonMetric] = [
        PeriodComparisonMetric(
            key="income",
            label="Total Income",
            current_value=total_income,
            previous_value=prev_income,
            change_amount=total_income - prev_income,
            change_pct=inc_delta_pct,
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
            change_pct=exp_delta_pct,
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
            change_pct=sav_delta_pct,
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
            change_pct=sr_delta,
            is_good=(savings_rate_pct >= prev_savings_rate_pct),
            formatted_current=f"{savings_rate_pct:.1f}%",
            formatted_previous=f"{prev_savings_rate_pct:.1f}%",
        ),
    ]

    return AnalyticsOverviewResponse(
        period_type=period_type,
        period_label=period_label,
        year=year,
        month=month if period_type == "monthly" else None,
        quarter=quarter if period_type == "quarterly" else None,
        half=half if period_type == "half_year" else None,
        has_enough_data=has_enough_data,
        health_score=health_score_data,
        trends=trends_data,
        expense_mix=expense_mix,
        top_5_categories=top_5_categories,
        top_5_expenses=top_5_expenses,
        comparison=comparison,
    )
