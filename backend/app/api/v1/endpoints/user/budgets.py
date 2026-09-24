import uuid
from datetime import date
from typing import List, Optional
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
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12)"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Year (e.g. 2026)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get total budget vs total spending metrics for a given month/year.
    """
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    # Subquery for transactions in that month/year
    spent_sub = (
        db.query(
            Transaction.category_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date) == target_month,
            func.extract("year", Transaction.transaction_date) == target_year,
        )
        .group_by(Transaction.category_id)
        .subquery()
    )

    rows = (
        db.query(
            Budget,
            func.coalesce(spent_sub.c.spent, 0).label("spent_amount"),
        )
        .outerjoin(spent_sub, Budget.category_id == spent_sub.c.category_id)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == target_month,
            Budget.year == target_year,
        )
        .all()
    )

    total_budget = 0.0
    total_spent = 0.0
    safe_count = 0
    warning_count = 0
    exceeded_count = 0

    for b, spent in rows:
        limit = float(b.limit_amount)
        sp = float(spent)
        total_budget += limit
        total_spent += sp

        if sp > limit:
            exceeded_count += 1
        elif sp >= (0.8 * limit):
            warning_count += 1
        else:
            safe_count += 1

    total_remaining = max(0.0, round(total_budget - total_spent, 2))
    overall_pct = round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0.0

    return BudgetSummaryResponse(
        month=target_month,
        year=target_year,
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
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12)"),
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Year (e.g. 2026)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all budgets for a given month and year with real-time actual spending.
    """
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    spent_sub = (
        db.query(
            Transaction.category_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date) == target_month,
            func.extract("year", Transaction.transaction_date) == target_year,
        )
        .group_by(Transaction.category_id)
        .subquery()
    )

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
            Budget.month == target_month,
            Budget.year == target_year,
        )
        .order_by(Budget.limit_amount.desc())
        .all()
    )

    return [_format_budget_response(b, cat_name, spent) for b, cat_name, spent in rows]


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new monthly budget for an expense category.
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

    # 2. Check for duplicate budget in the same month/year
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

    # 3. Create budget
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

    # 4. Calculate spent for response
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
