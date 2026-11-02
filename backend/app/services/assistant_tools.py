import calendar
import uuid
from datetime import date
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.category import Category
from app.models.goal import Goal, GoalContribution


class AssistantToolService:
    """
    Service containing read-only tools for the FinTrack AI Assistant.
    Each instance is bound to a specific user's authenticated session (db + user_id).
    The AI model only ever sees business parameters (e.g., month, year, limit).
    """

    def __init__(self, db: Session, user_id: uuid.UUID):
        self.db = db
        self.user_id = user_id

    def get_dashboard_summary(self, month: int, year: int) -> Dict[str, Any]:
        """Fetches high-level monthly income, expenses, net savings, and savings rate percentage.
        Use for questions like: 'How did I do this month?', 'What is my total savings rate?', 'How much did I spend in October 2026?'
        """
        if month < 1 or month > 12:
            return {"error": f"Invalid month: {month}. Month must be between 1 and 12."}

        last_day = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        res = (
            self.db.query(
                Transaction.type,
                func.coalesce(func.sum(Transaction.amount), 0.0).label("total")
            )
            .filter(
                Transaction.user_id == self.user_id,
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
            .group_by(Transaction.type)
            .all()
        )

        total_income = 0.0
        total_expenses = 0.0
        for r in res:
            if r.type == "income":
                total_income = float(r.total)
            elif r.type == "expense":
                total_expenses = float(r.total)

        net_savings = total_income - total_expenses
        savings_rate = round((net_savings / total_income * 100), 1) if total_income > 0 else 0.0

        return {
            "period": f"{month:02d}/{year}",
            "total_income": total_income,
            "total_expenses": total_expenses,
            "net_savings": net_savings,
            "savings_rate_pct": savings_rate,
            "has_records": (total_income > 0 or total_expenses > 0)
        }

    def get_budget_status(self, month: int, year: int) -> Dict[str, Any]:
        """Checks monthly budget limits, spent amounts, remaining amounts, and alert statuses for all categories.
        Use for questions like: 'Which budget am I over?', 'Am I on track with groceries?', 'Which budgets are critical or exceeded?'
        """
        if month < 1 or month > 12:
            return {"error": f"Invalid month: {month}. Month must be between 1 and 12."}

        last_day = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        # Expense subquery for this specific month
        spent_sub = (
            self.db.query(
                Transaction.category_id,
                func.coalesce(func.sum(Transaction.amount), 0.0).label("spent")
            )
            .filter(
                Transaction.user_id == self.user_id,
                Transaction.type == "expense",
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
            .group_by(Transaction.category_id)
            .subquery()
        )

        rows = (
            self.db.query(
                Budget.limit_amount,
                Category.name.label("category_name"),
                func.coalesce(spent_sub.c.spent, 0.0).label("spent_amount")
            )
            .join(Category, Budget.category_id == Category.id)
            .outerjoin(spent_sub, Budget.category_id == spent_sub.c.category_id)
            .filter(
                Budget.user_id == self.user_id,
                Budget.month == month,
                Budget.year == year
            )
            .order_by(Budget.limit_amount.desc())
            .all()
        )

        if not rows:
            return {
                "period": f"{month:02d}/{year}",
                "message": "No budgets have been configured for this month.",
                "budgets": []
            }

        budgets = []
        for limit_amount, category_name, spent_amount in rows:
            limit = float(limit_amount)
            spent = float(spent_amount)
            pct = round((spent / limit * 100), 1) if limit > 0 else 0.0

            if spent > limit:
                status = "exceeded"
            elif pct >= 80.0:
                status = "warning_critical"
            else:
                status = "on_track"

            budgets.append({
                "category": category_name,
                "limit": limit,
                "spent": spent,
                "remaining": max(0.0, limit - spent),
                "over_by": max(0.0, spent - limit),
                "percentage_used": pct,
                "status": status
            })

        return {
            "period": f"{month:02d}/{year}",
            "total_budgets_count": len(budgets),
            "budgets": budgets
        }

    def get_goals_summary(self) -> Dict[str, Any]:
        """Retrieves user's active financial savings goals, target amounts, current saved progress, and completion percentages.
        Use for questions like: 'How close is my emergency fund goal?', 'Show my active goals', 'What is my goal progress?'
        """
        goals = (
            self.db.query(Goal)
            .filter(Goal.user_id == self.user_id)
            .order_by(desc(Goal.created_at))
            .all()
        )

        if not goals:
            return {
                "message": "You currently have no savings goals created.",
                "goals": []
            }

        results = []
        for g in goals:
            contributions = (
                self.db.query(GoalContribution)
                .filter(GoalContribution.goal_id == g.id)
                .all()
            )
            saved = sum(float(c.amount) for c in contributions)
            target = float(g.target_amount)
            pct = round((saved / target * 100), 1) if target > 0 else 0.0

            results.append({
                "title": g.title,
                "target_amount": target,
                "saved_amount": saved,
                "remaining_amount": max(0.0, target - saved),
                "progress_pct": pct,
                "status": g.status,
                "deadline": g.deadline.strftime("%Y-%m-%d") if g.deadline else "No deadline"
            })

        return {
            "total_goals_count": len(results),
            "goals": results
        }

    def list_recent_transactions(self, limit: int = 5, transaction_type: str = "all") -> Dict[str, Any]:
        """Lists recent user transactions with date, category name, amount, type, and note.
        Use for questions like: 'What were my last 5 expenses?', 'Show recent purchases', 'What was my latest transaction?'
        """
        safe_limit = min(max(1, limit), 10)  # Bound between 1 and 10 to keep output small

        query = (
            self.db.query(
                Transaction.transaction_date,
                Transaction.amount,
                Transaction.type,
                Transaction.description,
                Category.name.label("category_name")
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(Transaction.user_id == self.user_id)
        )

        if transaction_type in ["income", "expense"]:
            query = query.filter(Transaction.type == transaction_type)

        txns = query.order_by(desc(Transaction.transaction_date), desc(Transaction.created_at)).limit(safe_limit).all()

        if not txns:
            return {"message": "No transactions found.", "transactions": []}

        items = []
        for t_date, amount, t_type, desc_text, cat_name in txns:
            items.append({
                "date": t_date.strftime("%Y-%m-%d"),
                "category": cat_name,
                "type": t_type,
                "amount": float(amount),
                "note": desc_text or ""
            })

        return {
            "count": len(items),
            "transactions": items
        }

    def get_spending_by_category(self, month: int, year: int) -> Dict[str, Any]:
        """Provides category-wise expense breakdown with amounts and share percentages for a specific month.
        Use for questions like: 'How much did I spend on Food this month?', 'What are my top spending categories?', 'Where is my money going?'
        """
        if month < 1 or month > 12:
            return {"error": f"Invalid month: {month}. Month must be between 1 and 12."}

        last_day = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        rows = (
            self.db.query(
                Category.name,
                func.coalesce(func.sum(Transaction.amount), 0.0).label("total")
            )
            .join(Transaction, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == self.user_id,
                Transaction.type == "expense",
                Transaction.transaction_date >= start_date,
                Transaction.transaction_date <= end_date
            )
            .group_by(Category.name)
            .order_by(desc("total"))
            .all()
        )

        total_expense = sum(float(r.total) for r in rows)
        if total_expense == 0.0:
            return {
                "period": f"{month:02d}/{year}",
                "message": "No expense transactions recorded for this period.",
                "total_expense": 0.0,
                "categories": []
            }

        breakdown = []
        for cat_name, total in rows:
            amt = float(total)
            pct = round((amt / total_expense * 100), 1)
            breakdown.append({
                "category": cat_name,
                "amount": amt,
                "share_pct": pct
            })

        return {
            "period": f"{month:02d}/{year}",
            "total_expense": total_expense,
            "categories": breakdown
        }

    def get_health_score(self, month: int, year: int) -> Dict[str, Any]:
        """Retrieves the user's Financial Health Score (0-100), rating label, factor breakdown (savings rate, budget adherence, expense stability, essentials), and actionable improvement tips.
        Use for questions like: 'Why is my health score 85?', 'What is my financial health score?', 'How can I improve my health score?'
        """
        if month < 1 or month > 12:
            return {"error": f"Invalid month: {month}."}

        last_day = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        totals = self.get_dashboard_summary(month=month, year=year)
        total_income = totals.get("total_income", 0.0)
        total_expenses = totals.get("total_expenses", 0.0)
        net_savings = totals.get("net_savings", 0.0)
        savings_rate = totals.get("savings_rate_pct", 0.0)

        from app.services.health_score_service import calculate_financial_health_score

        health_data = calculate_financial_health_score(
            db=self.db,
            user_id=self.user_id,
            period_type="monthly",
            year=year,
            month=month,
            start_date=start_date,
            end_date=end_date,
            period_months=[(year, month)],
            total_income=total_income,
            total_expenses=total_expenses,
            net_savings=net_savings,
            savings_rate_pct=savings_rate,
        )

        if not health_data.has_enough_data:
            return {
                "period": f"{month:02d}/{year}",
                "has_enough_data": False,
                "message": "Insufficient data to calculate Financial Health Score. FinTrack requires at least 10 transaction entries spanning at least 2 distinct weeks."
            }

        factors_summary = []
        for f in health_data.factors:
            factors_summary.append({
                "factor": f.name,
                "earned_points": f.earned_points,
                "max_points": f.max_points,
                "user_figure": f.user_figure_text,
                "rule": f.rule_explanation,
                "is_calculated": f.is_calculated,
                "not_calculated_reason": f.not_calculated_reason
            })

        return {
            "period": f"{month:02d}/{year}",
            "score": health_data.score,
            "status_label": health_data.status_label,
            "summary": health_data.explanation_summary,
            "improvement_tip": health_data.improvement_line,
            "factors": factors_summary
        }

    def compare_periods(
        self,
        current_month: int,
        current_year: int,
        compare_month: int,
        compare_year: int
    ) -> Dict[str, Any]:
        """Compares income, spending, and savings between two different months and calculates the change amount and percentage.
        Use for questions like: 'Am I spending more than last month?', 'Compare October 2026 with September 2026', 'How does this month compare to last month?'
        """
        curr = self.get_dashboard_summary(month=current_month, year=current_year)
        comp = self.get_dashboard_summary(month=compare_month, year=compare_year)

        curr_exp = curr.get("total_expenses", 0.0)
        comp_exp = comp.get("total_expenses", 0.0)
        exp_diff = round(curr_exp - comp_exp, 2)
        exp_pct = round(((curr_exp - comp_exp) / comp_exp * 100), 1) if comp_exp > 0 else (100.0 if curr_exp > 0 else 0.0)

        curr_inc = curr.get("total_income", 0.0)
        comp_inc = comp.get("total_income", 0.0)
        inc_diff = round(curr_inc - comp_inc, 2)
        inc_pct = round(((curr_inc - comp_inc) / comp_inc * 100), 1) if comp_inc > 0 else (100.0 if curr_inc > 0 else 0.0)

        curr_sav = curr.get("net_savings", 0.0)
        comp_sav = comp.get("net_savings", 0.0)
        sav_diff = round(curr_sav - comp_sav, 2)

        return {
            "current_period": f"{current_month:02d}/{current_year}",
            "current": {"income": curr_inc, "expenses": curr_exp, "savings": curr_sav},
            "compare_period": f"{compare_month:02d}/{compare_year}",
            "compared": {"income": comp_inc, "expenses": comp_exp, "savings": comp_sav},
            "changes": {
                "expense_change_amount": exp_diff,
                "expense_change_pct": exp_pct,
                "income_change_amount": inc_diff,
                "income_change_pct": inc_pct,
                "savings_change_amount": sav_diff
            }
        }

    def get_spending_trend(self, months: int = 6) -> Dict[str, Any]:
        """Fetches month-by-month spending and income totals over trailing months (up to 12) to analyze trends.
        Use for questions like: 'How has my spending changed over the last 6 months?', 'Is my spending increasing or decreasing?', 'What is my spending trend?'
        """
        safe_months = min(max(3, months), 12)
        today_dt = date.today()
        curr_m = today_dt.month
        curr_y = today_dt.year

        period_tuples = []
        for _ in range(safe_months):
            period_tuples.append((curr_y, curr_m))
            curr_m -= 1
            if curr_m < 1:
                curr_m = 12
                curr_y -= 1

        period_tuples.reverse()

        trend_data = []
        for y, m in period_tuples:
            summary = self.get_dashboard_summary(month=m, year=y)
            trend_data.append({
                "period": f"{m:02d}/{y}",
                "expenses": summary.get("total_expenses", 0.0),
                "income": summary.get("total_income", 0.0),
                "net_savings": summary.get("net_savings", 0.0)
            })

        return {
            "months_analyzed": len(trend_data),
            "monthly_history": trend_data
        }

    def get_app_help(self, topic: str) -> Dict[str, Any]:
        """Provides verified instructions on how to navigate and use FinTrack features.
        Use for questions like: 'Where do I set budget alerts?', 'Where can I download PDF reports?', 'How do I add an expense?', 'How do I create a goal?'
        """
        knowledge_base = {
            "budget_alerts": (
                "You can configure budget threshold alerts by going to the 'Budgets' tab and clicking 'Alert Settings' or the bell icon on any budget card. "
                "You can customize alert thresholds (such as 80% or 100%) and enable in-app and email notifications."
            ),
            "pdf_report": (
                "To download a monthly PDF financial report, go to the 'Analytics' tab and click the 'Download PDF Report' button in the upper right. "
                "The report includes income vs. expense breakdown, category charts, and budget adherence summaries."
            ),
            "add_expense": (
                "You can record an expense by clicking the green '+ Add Expense' button in the top navigation bar, or by navigating to the 'Expenses' tab and clicking 'Add Expense'."
            ),
            "add_income": (
                "You can record income by clicking the '+ Add Income' button in the top navigation bar, or by navigating to the 'Income' tab and entering the amount, source, and date."
            ),
            "goals": (
                "To manage your financial goals, navigate to the 'Goals' tab. You can create a new goal with a target amount and target date, and click 'Add Money' on any goal card to log contributions."
            ),
            "categories": (
                "You can view and create custom categories by going to 'Settings' in the sidebar and selecting 'Categories'."
            ),
            "health_score": (
                "Your Financial Health Score (0-100) is calculated in the 'Analytics' tab using 4 key factors: Savings Rate (35 pts), Budget Adherence (30 pts), Expense Stability (20 pts), and Essential vs. Non-Essential balance (15 pts)."
            )
        }

        topic_lower = topic.lower()
        for key, text in knowledge_base.items():
            if key in topic_lower or any(word in topic_lower for word in key.split("_")):
                return {"topic": key, "guidance": text}

        return {
            "topic": topic,
            "guidance": (
                "FinTrack allows you to manage your personal finances across 5 core sections: "
                "Dashboard (summary & trends), Analytics (health score & PDF exports), Budgets (limits & alert notifications), "
                "Goals (savings targets & milestones), and Expenses/Income (transaction tracking). "
                "Use the navigation sidebar on the left or the top action buttons to access any feature."
            )
        }

    def get_tools_list(self) -> List[Any]:
        """Returns the list of bound callable methods ready to be passed directly to Gemini."""
        return [
            self.get_dashboard_summary,
            self.get_budget_status,
            self.get_goals_summary,
            self.list_recent_transactions,
            self.get_spending_by_category,
            self.get_health_score,
            self.compare_periods,
            self.get_spending_trend,
            self.get_app_help,
        ]
