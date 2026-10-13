import calendar
import uuid
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.category import Category
from app.schemas.analytics import HealthScoreFactor, FinancialHealthScoreData

ESSENTIAL_CATEGORIES = {"rent", "bills", "food", "healthcare", "transport", "education"}
NON_ESSENTIAL_CATEGORIES = {"shopping", "entertainment", "subscriptions"}


def _plural_months(count: int) -> str:
    return f"{count} earlier month" if count == 1 else f"{count} earlier months"


def calculate_financial_health_score(
    db: Session,
    user_id: uuid.UUID,
    period_type: str,
    year: int,
    month: Optional[int],
    start_date: date,
    end_date: date,
    period_months: List[tuple[int, int]],
    total_income: float,
    total_expenses: float,
    net_savings: float,
    savings_rate_pct: float,
) -> FinancialHealthScoreData:
    """
    Unified Financial Health Score calculation used by BOTH Dashboard and Analytics.
    Scores 4 key factors (out of 100):
    1. Savings rate (35 pts)
    2. Budget adherence (30 pts)
    3. Expense stability (20 pts)
    4. Essential vs Non-essential spending (15 pts)

    Rule: Requires at least 10 entries over at least 2 different weeks to show a score.
    """
    # -------------------------------------------------------------
    # 0. Check Minimum Data Requirement: >= 10 entries over >= 2 different weeks
    # -------------------------------------------------------------
    tx_records = (
        db.query(Transaction.transaction_date)
        .filter(Transaction.user_id == user_id)
        .all()
    )
    total_entries = len(tx_records)
    distinct_weeks = {
        t[0].isocalendar()[:2] for t in tx_records if t[0] is not None
    }
    has_enough_data = (total_entries >= 10) and (len(distinct_weeks) >= 2)

    if not has_enough_data:
        return FinancialHealthScoreData(
            score=None,
            status_label="Add more entries",
            status_color="#94A3B8",
            factors_calculated_count=0,
            total_factors_count=4,
            score_notes=[
                "Add at least 10 entries over 2 different weeks to unlock your Financial Health Score."
            ],
            improvement_line="Add a few more weeks of entries to see your score.",
            missing_factor_note="Need at least 10 entries across 2 different weeks.",
            explanation_summary="Add at least 10 entries over at least 2 weeks to calculate your score.",
            factors=[],
        )

    # -------------------------------------------------------------
    # 1. Factor 1: Savings Rate (35 points)
    # -------------------------------------------------------------
    factor1_name = "Savings Rate"
    factor1_max = 35.0
    factor1_rule = "Full 35 points at a savings rate of 30% or more. A rate of 0% or below earns 0 points."

    if total_income > 0:
        factor1_calc = True
        sr_ratio = net_savings / total_income
        if sr_ratio >= 0.30:
            factor1_pts = 35.0
        elif sr_ratio <= 0.0:
            factor1_pts = 0.0
        else:
            factor1_pts = round(35.0 * (sr_ratio / 0.30), 1)
        factor1_user_fig = f"Your savings rate is {savings_rate_pct:.1f}%, earning {factor1_pts:.1f} of 35 points."
        factor1_reason = None
    elif total_expenses > 0:
        factor1_calc = True
        factor1_pts = 0.0
        factor1_user_fig = "No income logged with expenses present (0% savings rate), earning 0 of 35 points."
        factor1_reason = None
    else:
        factor1_calc = False
        factor1_pts = 0.0
        factor1_user_fig = "No income or expense entries logged in this period."
        factor1_reason = "Add income entries for this period to calculate your savings rate."

    # -------------------------------------------------------------
    # 2. Factor 2: Budget Adherence (30 points)
    # -------------------------------------------------------------
    factor2_name = "Budget Adherence"
    factor2_max = 30.0
    factor2_rule = "Full credit for spending within budget, half credit up to 10% over, no credit if over 10%. Points average across all budgets (max 30)."

    budgets_query = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.year == year
    )
    if period_type == "monthly":
        budgets_query = budgets_query.filter(Budget.month == (month or date.today().month))
    else:
        m_list = [pm[1] for pm in period_months]
        budgets_query = budgets_query.filter(Budget.month.in_(m_list))

    user_budgets = budgets_query.all()

    within_budget_count = 0
    total_budget_count = len(user_budgets)

    if not user_budgets:
        factor2_calc = False
        factor2_pts = 0.0
        factor2_user_fig = "No category budgets set for this period."
        factor2_reason = "Set a budget to include budget adherence in your score."
    else:
        factor2_calc = True
        credits = []
        for b in user_budgets:
            b_spent = float(db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
                Transaction.user_id == user_id,
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
            factor2_user_fig = f"Maintained {within_budget_count} of {total_budget_count} budgets within limit ({avg_credit * 100:.0f}% adherence), earning {factor2_pts:.1f} of 30 points."
        else:
            factor2_pts = 30.0
            factor2_user_fig = "All budget limits respected, earning 30 of 30 points."
        factor2_reason = None

    # -------------------------------------------------------------
    # 3. Factor 3: Expense Stability (20 points)
    # -------------------------------------------------------------
    factor3_name = "Expense Stability"
    factor3_max = 20.0
    factor3_rule = "Full 20 points for an expense increase of 10% or less compared to prior 3-month average. Declines to 0 at a 50% increase. Spending decreases never lose points."

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
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.transaction_date >= p_start,
            Transaction.transaction_date <= p_end
        ).scalar() or 0.0)

        m_count = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_date >= p_start,
            Transaction.transaction_date <= p_end
        ).scalar() or 0
        if m_count > 0:
            prior_monthly_expenses.append(m_exp)

    if len(prior_monthly_expenses) < 2:
        factor3_calc = False
        factor3_pts = 0.0
        factor3_user_fig = f"Only {_plural_months(len(prior_monthly_expenses))} of history available."
        factor3_reason = f"Requires at least 2 earlier months of expense entries to assess stability (currently {len(prior_monthly_expenses)})."
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
            factor3_user_fig = f"Monthly spending decreased by {abs(pct_exp_increase):.1f}% vs prior average of ₹{prior_avg_exp:,.0f}, earning 20.0 of 20 points."
        else:
            factor3_user_fig = f"Monthly spending increased by {pct_exp_increase:.1f}% vs prior average of ₹{prior_avg_exp:,.0f}, earning {factor3_pts:.1f} of 20 points."
        factor3_reason = None

    # -------------------------------------------------------------
    # 4. Factor 4: Essential vs Non-Essential Spending (15 points)
    # -------------------------------------------------------------
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
            Transaction.user_id == user_id,
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

    # Requirement 3: If none of user's spending falls in essential or non-essential lists,
    # treat factor as not calculated instead of giving full points.
    if relevant_expenses <= 0:
        factor4_calc = False
        factor4_pts = 0.0
        factor4_user_fig = "No spending in essential or lifestyle categories (only 'Other' or custom categories)."
        factor4_reason = "Assign expenses to standard categories (Rent, Food, Bills, Shopping, etc.) to assess this factor."
    else:
        factor4_calc = True
        non_ess_share_pct = (non_essential_total / relevant_expenses) * 100.0
        if non_ess_share_pct <= 30.0:
            factor4_pts = 15.0
        elif non_ess_share_pct >= 60.0:
            factor4_pts = 0.0
        else:
            factor4_pts = round(15.0 * ((60.0 - non_ess_share_pct) / 30.0), 1)
        factor4_user_fig = f"Lifestyle share: {non_ess_share_pct:.1f}% (₹{non_essential_total:,.0f} of ₹{relevant_expenses:,.0f}), earning {factor4_pts:.1f} of 15 points."
        factor4_reason = None

    # -------------------------------------------------------------
    # 5. Aggregate Score & Dynamic Scaling
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

    active_factors = [f for f in factors_list if f.is_calculated]
    calculated_count = len(active_factors)

    if calculated_count == 0:
        final_score = None
        status_label = "Needs more data"
        status_color = "#94A3B8"
        missing_note = "Need more transaction activity across this period to compute a score."
    else:
        sum_earned = sum(f.earned_points for f in active_factors)
        sum_max = sum(f.max_points for f in active_factors)
        final_score = min(100, max(0, round((sum_earned / sum_max) * 100)))

        # Status Bands: 80 to 100 Excellent, 60 to 79 Good, 40 to 59 Fair, below 40 Needs attention
        if final_score >= 80:
            status_label = "Excellent"
            status_color = "#10B981"  # Emerald
        elif final_score >= 60:
            status_label = "Good"
            status_color = "#3B82F6"  # Blue
        elif final_score >= 40:
            status_label = "Fair"
            status_color = "#F59E0B"  # Amber
        else:
            status_label = "Needs attention"
            status_color = "#EF4444"  # Red

        if calculated_count < 4:
            first_missing = next(f for f in factors_list if not f.is_calculated)
            missing_note = f"Based on {calculated_count} of 4 factors. {first_missing.not_calculated_reason or 'Add more entries to include all factors.'}"
        else:
            missing_note = None

    # -------------------------------------------------------------
    # 6. Plain-Language Notes & Improvement Tip
    # -------------------------------------------------------------
    score_notes = []
    if total_income > 0:
        score_notes.append(f"You saved {savings_rate_pct:.0f}% of your income this period.")
    elif total_expenses > 0:
        score_notes.append("Expenses logged with no income recorded this period.")

    if factor2_calc:
        score_notes.append(f"You stayed within {within_budget_count} of {total_budget_count} budgets.")

    if shopping_exp_amount > 0 and total_expenses > 0:
        shop_pct = (shopping_exp_amount / total_expenses) * 100
        score_notes.append(f"Shopping made up {shop_pct:.0f}% of total expenses.")

    if len(score_notes) < 2:
        if factor3_calc and pct_exp_increase <= 10.0:
            score_notes.append("Your monthly expenses remained stable compared to prior months.")
        else:
            score_notes.append("Consistent tracking helps build financial resilience.")

    # Determine what would improve the score most
    improvement_candidates = []
    if not factor2_calc:
        improvement_candidates.append((30.0, "Setting category budgets would have the highest immediate impact on your score."))
    elif factor2_pts < 25:
        improvement_candidates.append((30.0 - factor2_pts, "Staying closer to your category budgets would boost your score most."))

    if total_income > 0 and savings_rate_pct < 30.0:
        gap = max(0, 30.0 - savings_rate_pct)
        improvement_candidates.append((gap * 1.16, f"Increasing your savings rate toward 30% (+{gap:.0f}%) would improve your score most."))

    if not factor4_calc:
        improvement_candidates.append((15.0, "Categorizing expenses into standard categories will activate the lifestyle factor."))
    elif factor4_pts < 12:
        improvement_candidates.append((15.0 - factor4_pts, "Keeping lifestyle expenses (Shopping, Entertainment) below 30% would lift your score."))

    if not factor3_calc:
        improvement_candidates.append((10.0, "Continuing to log expenses for 2+ months will activate expense stability tracking."))

    improvement_candidates.sort(key=lambda x: x[0], reverse=True)
    improvement_line = improvement_candidates[0][1] if improvement_candidates else "Keep maintaining positive savings and respecting your budgets."

    explanation_summary = (
        "Calculated from 4 core factors: Savings Rate (35 pts), Budget Adherence (30 pts), "
        "Expense Stability (20 pts), and Essential Spending (15 pts). "
        "Status bands: 80–100 Excellent, 60–79 Good, 40–59 Fair, below 40 Needs attention. "
        "Every number comes from your own verified entries."
    )

    return FinancialHealthScoreData(
        score=final_score,
        status_label=status_label,
        status_color=status_color,
        factors_calculated_count=calculated_count,
        total_factors_count=4,
        score_notes=score_notes[:3],
        improvement_line=improvement_line,
        missing_factor_note=missing_note,
        explanation_summary=explanation_summary,
        factors=factors_list,
    )
