import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.api.deps import get_current_admin_user

router = APIRouter()

class AdminCategoryResponse(BaseModel):
    id: str
    name: str
    type: str
    is_default: bool
    transaction_count: int
    created_at: Optional[datetime] = None

class CreateCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    type: Optional[str] = Field("expense", pattern="^(expense|income)$")

class UpdateCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)

class DeleteCategoryRequest(BaseModel):
    target_category_id: Optional[str] = None

@router.get("", response_model=List[AdminCategoryResponse])
def get_admin_categories(
    type: Optional[str] = Query(None, description="Filter by category type: 'expense', 'income', or all"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Returns the list of standard categories (expense or income) everyone sees.
    Includes transaction counts for each category without revealing any individual user transactions or amounts.
    """
    query = db.query(Category).filter(
        Category.is_default == True,
        Category.user_id.is_(None)
    )

    if type and type.lower() in ("expense", "income"):
        query = query.filter(Category.type == type.lower())

    categories = query.order_by(Category.name.asc()).all()

    # Aggregate transaction count per category
    tx_counts = dict(
        db.query(Transaction.category_id, func.count(Transaction.id))
        .group_by(Transaction.category_id)
        .all()
    )

    results = []
    for cat in categories:
        results.append(
            AdminCategoryResponse(
                id=str(cat.id),
                name=cat.name,
                type=cat.type,
                is_default=cat.is_default,
                transaction_count=tx_counts.get(cat.id, 0),
                created_at=cat.created_at
            )
        )

    return results

@router.post("", response_model=AdminCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_admin_category(
    data: CreateCategoryRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Creates a new standard category (expense or income). Category names must be unique within their type.
    """
    cleaned_name = data.name.strip()
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name cannot be empty."
        )

    cat_type = data.type.lower() if data.type else "expense"
    if cat_type not in ("expense", "income"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category type must be either 'expense' or 'income'."
        )

    # Check case-insensitive uniqueness among standard categories of the same type
    existing = (
        db.query(Category)
        .filter(
            Category.is_default == True,
            Category.type == cat_type,
            Category.user_id.is_(None),
            func.lower(Category.name) == cleaned_name.lower()
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A standard {cat_type} category named '{cleaned_name}' already exists."
        )

    new_cat = Category(
        name=cleaned_name,
        type=cat_type,
        is_default=True,
        is_active=True,
        user_id=None
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)

    return AdminCategoryResponse(
        id=str(new_cat.id),
        name=new_cat.name,
        type=new_cat.type,
        is_default=new_cat.is_default,
        transaction_count=0,
        created_at=new_cat.created_at
    )

@router.put("/{category_id}", response_model=AdminCategoryResponse)
def update_admin_category(
    category_id: str,
    data: UpdateCategoryRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Renames a standard category. Category names must remain unique within their type.
    """
    cleaned_name = data.name.strip()
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name cannot be empty."
        )

    try:
        cat_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID format.")

    category = (
        db.query(Category)
        .filter(
            Category.id == cat_uuid,
            Category.is_default == True,
            Category.user_id.is_(None)
        )
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # Check uniqueness against other standard categories of the same type
    duplicate = (
        db.query(Category)
        .filter(
            Category.id != cat_uuid,
            Category.is_default == True,
            Category.type == category.type,
            Category.user_id.is_(None),
            func.lower(Category.name) == cleaned_name.lower()
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Another standard {category.type} category named '{cleaned_name}' already exists."
        )

    category.name = cleaned_name
    db.commit()
    db.refresh(category)

    tx_count = db.query(func.count(Transaction.id)).filter(Transaction.category_id == category.id).scalar() or 0

    return AdminCategoryResponse(
        id=str(category.id),
        name=category.name,
        type=category.type,
        is_default=category.is_default,
        transaction_count=tx_count,
        created_at=category.created_at
    )

@router.delete("/{category_id}")
def delete_admin_category(
    category_id: str,
    payload: Optional[DeleteCategoryRequest] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Deletes a standard category (expense or income).
    If the category has transactions or budgets, requires a target_category_id to reassign them to
    so that no user entries are lost.
    """
    try:
        cat_uuid = uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID format.")

    category = (
        db.query(Category)
        .filter(
            Category.id == cat_uuid,
            Category.is_default == True,
            Category.user_id.is_(None)
        )
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    tx_count = db.query(func.count(Transaction.id)).filter(Transaction.category_id == cat_uuid).scalar() or 0
    budget_count = db.query(func.count(Budget.id)).filter(Budget.category_id == cat_uuid).scalar() or 0

    target_id_str = payload.target_category_id if payload else None

    if tx_count > 0 or budget_count > 0:
        if not target_id_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This category has {tx_count} transaction(s) and {budget_count} budget(s). Please choose another {category.type} category to move them to before deleting."
            )

        try:
            target_uuid = uuid.UUID(target_id_str)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target category ID format.")

        if target_uuid == cat_uuid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target category cannot be the same category.")

        target_cat = (
            db.query(Category)
            .filter(
                Category.id == target_uuid,
                Category.is_default == True,
                Category.type == category.type,
                Category.user_id.is_(None)
            )
            .first()
        )
        if not target_cat:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target {category.type} category for reassignment was not found."
            )

        # Reassign transactions
        db.query(Transaction).filter(Transaction.category_id == cat_uuid).update(
            {Transaction.category_id: target_uuid},
            synchronize_session=False
        )

        # Reassign budgets if any
        old_budgets = db.query(Budget).filter(Budget.category_id == cat_uuid).all()
        for b in old_budgets:
            existing_target_budget = (
                db.query(Budget)
                .filter(
                    Budget.user_id == b.user_id,
                    Budget.category_id == target_uuid,
                    Budget.month == b.month,
                    Budget.year == b.year
                )
                .first()
            )
            if existing_target_budget:
                existing_target_budget.limit_amount += b.limit_amount
                db.delete(b)
            else:
                b.category_id = target_uuid

    db.delete(category)
    db.commit()

    return {
        "success": True,
        "message": f"Category '{category.name}' deleted successfully.",
        "reassigned_transactions": tx_count,
        "reassigned_budgets": budget_count
    }
