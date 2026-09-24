import uuid
from datetime import date
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BudgetSummaryResponse,
    BudgetCategoryOption,
)
from app.api.deps import get_current_user

router = APIRouter()


def parse_period(
    period_type: str = "monthly",
    period_value: Optional[Union[int, str]] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    today = date.today()
    target_year = year or today.year

    pv_int: Optional[int] = None
    if period_value is not None:
        try:
            cleaned = str(period_value).strip().upper().replace("Q", "").replace("H", "")
            pv_int = int(cleaned)
        except (ValueError, TypeError):
            pv_int = None

    if period_type == "quarterly":
        # period_value: 1 (Q1), 2 (Q2), 3 (Q3), 4 (Q4)
        pv = pv_int or ((month - 1) // 3 + 1 if month else (today.month - 1) // 3 + 1)
        pv = max(1, min(4, pv))
        start_m = (pv - 1) * 3 + 1
        months = [start_m, start_m + 1, start_m + 2]
        quarter_names = ["Q1 (Jan - Mar)", "Q2 (Apr - Jun)", "Q3 (Jul - Sep)", "Q4 (Oct - Dec)"]
        label = f"{quarter_names[pv - 1]} {target_year}"
        return "quarterly", pv, months, target_year, label

    elif period_type == "half_yearly":
        # period_value: 1 (H1), 2 (H2)
        pv = pv_int or ((month - 1) // 6 + 1 if month else (today.month - 1) // 6 + 1)
        pv = max(1, min(2, pv))
        start_m = (pv - 1) * 6 + 1
        months = list(range(start_m, start_m + 6))
        half_names = ["H1 (Jan - Jun)", "H2 (Jul - Dec)"]
        label = f"{half_names[pv - 1]} {target_year}"
        return "half_yearly", pv, months, target_year, label

    elif period_type == "yearly":
        months = list(range(1, 13))
        label = f"Full Year {target_year}"
        return "yearly", 1, months, target_year, label

    else:
        # monthly (default)
        target_month = month or period_value or today.month
        target_month = max(1, min(12, target_month))
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        label = f"{month_names[target_month - 1]} {target_year}"
        return "monthly", target_month, [target_month], target_year, label


def _format_budget_response(b: Budget, category_name: str, spent_amount: float) -> BudgetResponse:
    limit = float(b.limit_amount)
    spent = round(float(spent_amount), 2)
    remaining = max(0.0, round(limit - spent, 2))
    percentage = round((spent / limit) * 100, 1) if limit > 0 else 0.0

    if spent > limit:
        calc_status = "exceeded"
    elif spent >= (0.8 * limit):
        calc_status = "warning"
    else:
        calc_status = "safe"

    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    plabel = f"{month_names[b.month - 1]} {b.year}"

    return BudgetResponse(
        id=b.id,
        user_id=b.user_id,
        category_id=b.category_id,
        category_name=category_name,
        type=b.type,
        month=b.month,
        year=b.year,
        limit_amount=limit,
        spent_amount=spent,
        remaining_amount=remaining,
        percentage_used=percentage,
        status=calc_status,
        period_type="monthly",
        period_label=plabel,
        months_budgeted=1,
        created_at=b.created_at,
        updated_at=b.updated_at,
    )


@router.get("/categories", response_model=List[BudgetCategoryOption])
def get_budget_eligible_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get active expense categories available for setting a budget.
    """
    categories = (
        db.query(Category)
        .filter(Category.type == "expense", Category.is_active.is_(True))
        .order_by(Category.name.asc())
        .all()
    )
    return categories


@router.get("/summary", response_model=BudgetSummaryResponse)
def get_monthly_budget_summary(
    period_type: str = Query("monthly", description="Period type (monthly, quarterly, half_yearly, yearly)"),
    period_value: Optional[Union[int, str]] = Query(None, description="Period value (1-12 for month, 1-4 or Q1-Q4 for quarter, 1-2 or H1-H2 for half-year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12)"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Year (e.g. 2026)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get total budget vs total spending metrics for a given period (Monthly, Quarterly, Half-Yearly, Yearly).
    """
    ptype, pval, target_months, target_year, plabel = parse_period(period_type, period_value, month, year)

    # Subquery for transactions in that period
    spent_sub = (
        db.query(
            Transaction.category_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date).in_(target_months),
            func.extract("year", Transaction.transaction_date) == target_year,
        )
        .group_by(Transaction.category_id)
        .subquery()
    )

    # Subquery for budget limits in target_months
    budget_sub = (
        db.query(
            Budget.category_id,
            func.sum(Budget.limit_amount).label("limit_amount"),
        )
        .filter(
            Budget.user_id == current_user.id,
            Budget.month.in_(target_months),
            Budget.year == target_year,
        )
        .group_by(Budget.category_id)
        .subquery()
    )

    rows = (
        db.query(
            budget_sub.c.category_id,
            budget_sub.c.limit_amount,
            func.coalesce(spent_sub.c.spent, 0).label("spent_amount"),
        )
        .outerjoin(spent_sub, budget_sub.c.category_id == spent_sub.c.category_id)
        .all()
    )

    total_budget = 0.0
    total_spent = 0.0
    safe_count = 0
    warning_count = 0
    exceeded_count = 0

    for cat_id, limit, spent in rows:
        lim = float(limit)
        sp = float(spent)
        total_budget += lim
        total_spent += sp

        if sp > lim:
            exceeded_count += 1
        elif sp >= (0.8 * lim):
            warning_count += 1
        else:
            safe_count += 1

    total_remaining = max(0.0, round(total_budget - total_spent, 2))
    overall_pct = round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0.0

    return BudgetSummaryResponse(
        month=target_months[0] if len(target_months) == 1 else None,
        year=target_year,
        period_type=ptype,
        period_label=plabel,
        total_budget=round(total_budget, 2),
        total_spent=round(total_spent, 2),
        total_remaining=total_remaining,
        overall_percentage=overall_pct,
        budget_count=len(rows),
        safe_count=safe_count,
        warning_count=warning_count,
        exceeded_count=exceeded_count,
    )


@router.get("", response_model=List[BudgetResponse])
def list_user_budgets(
    period_type: str = Query("monthly", description="Period type (monthly, quarterly, half_yearly, yearly)"),
    period_value: Optional[Union[int, str]] = Query(None, description="Period value (1-12 for month, 1-4 or Q1-Q4 for quarter, 1-2 or H1-H2 for half-year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12)"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Year (e.g. 2026)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all budgets for a given period (monthly, quarterly, half-yearly, yearly) with real-time actual spending.
    """
    ptype, pval, target_months, target_year, plabel = parse_period(period_type, period_value, month, year)

    # Subquery for transactions in that period
    spent_sub = (
        db.query(
            Transaction.category_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date).in_(target_months),
            func.extract("year", Transaction.transaction_date) == target_year,
        )
        .group_by(Transaction.category_id)
        .subquery()
    )

    if ptype == "monthly":
        t_month = target_months[0]
        rows = (
            db.query(
                Budget,
                Category.name.label("category_name"),
                func.coalesce(spent_sub.c.spent, 0).label("spent_amount"),
            )
            .join(Category, Budget.category_id == Category.id)
            .outerjoin(spent_sub, Budget.category_id == spent_sub.c.category_id)
            .filter(
                Budget.user_id == current_user.id,
                Budget.month == t_month,
                Budget.year == target_year,
            )
            .order_by(Budget.limit_amount.desc())
            .all()
        )
        return [_format_budget_response(b, cat_name, spent) for b, cat_name, spent in rows]
    else:
        # Multi-month aggregate (Quarterly, Half-Yearly, Yearly)
        budget_sub = (
            db.query(
                Budget.category_id,
                func.sum(Budget.limit_amount).label("total_limit"),
                func.count(Budget.id).label("months_count"),
                func.min(Budget.created_at).label("created_at"),
                func.max(Budget.updated_at).label("updated_at"),
            )
            .filter(
                Budget.user_id == current_user.id,
                Budget.month.in_(target_months),
                Budget.year == target_year,
            )
            .group_by(Budget.category_id)
            .subquery()
        )

        rows = (
            db.query(
                budget_sub.c.category_id,
                Category.name.label("category_name"),
                budget_sub.c.total_limit,
                budget_sub.c.months_count,
                budget_sub.c.created_at,
                budget_sub.c.updated_at,
                func.coalesce(spent_sub.c.spent, 0).label("spent_amount"),
            )
            .join(Category, budget_sub.c.category_id == Category.id)
            .outerjoin(spent_sub, budget_sub.c.category_id == spent_sub.c.category_id)
            .order_by(budget_sub.c.total_limit.desc())
            .all()
        )

        result = []
        for cat_id, cat_name, total_limit, months_count, cr_at, up_at, spent in rows:
            lim = float(total_limit)
            sp = round(float(spent), 2)
            rem = max(0.0, round(lim - sp, 2))
            pct = round((sp / lim) * 100, 1) if lim > 0 else 0.0

            if sp > lim:
                c_status = "exceeded"
            elif sp >= (0.8 * lim):
                c_status = "warning"
            else:
                c_status = "safe"

            result.append(
                BudgetResponse(
                    id=cat_id,
                    user_id=current_user.id,
                    category_id=cat_id,
                    category_name=cat_name,
                    type="expense",
                    month=None,
                    year=target_year,
                    limit_amount=lim,
                    spent_amount=sp,
                    remaining_amount=rem,
                    percentage_used=pct,
                    status=c_status,
                    period_type=ptype,
                    period_label=plabel,
                    months_budgeted=months_count,
                    created_at=cr_at,
                    updated_at=up_at,
                )
            )
        return result


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new budget for an expense category. Supports single month or multi-month periods.
    """
    # 1. Verify category exists and is an expense category
    category = db.query(Category).filter(Category.id == budget_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found.",
        )
    if category.type != "expense":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Budgets can only be set for expense categories.",
        )

    # 2. Determine target months to apply
    target_months = [budget_in.month]
    if budget_in.apply_to_period == "quarter":
        q = (budget_in.month - 1) // 3 + 1
        s_m = (q - 1) * 3 + 1
        target_months = [s_m, s_m + 1, s_m + 2]
    elif budget_in.apply_to_period == "half_year":
        h = (budget_in.month - 1) // 6 + 1
        s_m = (h - 1) * 6 + 1
        target_months = list(range(s_m, s_m + 6))
    elif budget_in.apply_to_period == "year":
        target_months = list(range(1, 13))

    if budget_in.apply_to_period == "single_month":
        # Check duplicate
        existing = (
            db.query(Budget)
            .filter(
                Budget.user_id == current_user.id,
                Budget.category_id == budget_in.category_id,
                Budget.month == budget_in.month,
                Budget.year == budget_in.year,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A budget for '{category.name}' already exists for {budget_in.month}/{budget_in.year}. Please edit the existing budget instead.",
            )
        new_budget = Budget(
            user_id=current_user.id,
            category_id=budget_in.category_id,
            type="expense",
            month=budget_in.month,
            year=budget_in.year,
            limit_amount=budget_in.limit_amount,
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
    else:
        # Upsert across target months in period
        created_budgets = []
        for m in target_months:
            existing = (
                db.query(Budget)
                .filter(
                    Budget.user_id == current_user.id,
                    Budget.category_id == budget_in.category_id,
                    Budget.month == m,
                    Budget.year == budget_in.year,
                )
                .first()
            )
            if existing:
                existing.limit_amount = budget_in.limit_amount
                created_budgets.append(existing)
            else:
                nb = Budget(
                    user_id=current_user.id,
                    category_id=budget_in.category_id,
                    type="expense",
                    month=m,
                    year=budget_in.year,
                    limit_amount=budget_in.limit_amount,
                )
                db.add(nb)
                created_budgets.append(nb)
        db.commit()
        new_budget = created_budgets[0]

    # Calculate spent for response
    spent = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == new_budget.category_id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date) == new_budget.month,
            func.extract("year", Transaction.transaction_date) == new_budget.year,
        )
        .scalar()
        or 0.0
    )

    return _format_budget_response(new_budget, category.name, float(spent))


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget_by_id(
    budget_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get details of a single budget by ID.
    """
    row = (
        db.query(Budget, Category.name.label("category_name"))
        .join(Category, Budget.category_id == Category.id)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    b, cat_name = row
    spent = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == b.category_id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date) == b.month,
            func.extract("year", Transaction.transaction_date) == b.year,
        )
        .scalar()
        or 0.0
    )

    return _format_budget_response(b, cat_name, float(spent))


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: uuid.UUID,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the limit amount of an existing budget.
    """
    row = (
        db.query(Budget, Category.name.label("category_name"))
        .join(Category, Budget.category_id == Category.id)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    b, cat_name = row
    b.limit_amount = budget_in.limit_amount
    db.add(b)
    db.commit()
    db.refresh(b)

    spent = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == b.category_id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date) == b.month,
            func.extract("year", Transaction.transaction_date) == b.year,
        )
        .scalar()
        or 0.0
    )

    return _format_budget_response(b, cat_name, float(spent))


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a budget.
    """
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted successfully", "id": str(budget_id)}
