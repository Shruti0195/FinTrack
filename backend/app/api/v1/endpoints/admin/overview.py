from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.support_report import SupportReport
from app.api.deps import get_current_admin_user

router = APIRouter()

class ReportedIssueSummary(BaseModel):
    id: str
    report_number: Optional[int] = None
    title: str
    description: Optional[str] = None
    report_type: Optional[str] = None
    page: Optional[str] = None
    status: str
    created_at: datetime
    reporter_name: Optional[str] = None
    reporter_email: Optional[str] = None

class RecentUserSummary(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

class TopCategorySummary(BaseModel):
    id: str
    name: str
    type: str
    transaction_count: int

class AdminMetricsResponse(BaseModel):
    total_users: int
    total_categories: int
    income_categories: int
    expense_categories: int
    recent_users: List[RecentUserSummary]
    top_income_categories: List[TopCategorySummary]
    top_expense_categories: List[TopCategorySummary]
    latest_issues: List[ReportedIssueSummary]
    total_goals: Optional[int] = 0

@router.get("/metrics", response_model=AdminMetricsResponse)
def get_admin_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Returns summary dashboard statistics:
    1. Total Users
    2. Total Categories
    3. Income Categories
    4. Expense Categories
    5. Recent 3 Registered Users
    6. Top Used 3 Income Categories (by transaction volume)
    7. Top Used 3 Expense Categories (by transaction volume)
    8. Latest 3 Reported Issues

    STRICT PRIVACY: Never reveals passwords, tokens, balances, or individual financial details.
    """
    # 1. Total registered users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # 2. Total active categories
    total_categories = (
        db.query(func.count(Category.id))
        .filter(Category.is_active == True)
        .scalar() or 0
    )

    # 3. Income categories count
    income_categories = (
        db.query(func.count(Category.id))
        .filter(Category.is_active == True, Category.type == 'income')
        .scalar() or 0
    )

    # 4. Expense categories count
    expense_categories = (
        db.query(func.count(Category.id))
        .filter(Category.is_active == True, Category.type == 'expense')
        .scalar() or 0
    )

    # 5. Recent 3 registered users
    raw_recent_users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .limit(3)
        .all()
    )

    recent_users = [
        RecentUserSummary(
            id=str(u.id),
            name=u.name,
            email=u.email,
            role=str(u.role),
            is_active=bool(u.is_active),
            created_at=u.created_at,
        )
        for u in raw_recent_users
    ]

    # 6. Top 3 used income categories (by transaction count)
    raw_top_income = (
        db.query(
            Category.id,
            Category.name,
            Category.type,
            func.count(Transaction.id).label('txn_count')
        )
        .outerjoin(Transaction, Category.id == Transaction.category_id)
        .filter(Category.is_active == True, Category.type == 'income')
        .group_by(Category.id, Category.name, Category.type)
        .order_by(desc('txn_count'), Category.name.asc())
        .limit(3)
        .all()
    )

    top_income_categories = [
        TopCategorySummary(
            id=str(c.id),
            name=c.name,
            type=str(c.type),
            transaction_count=int(c.txn_count or 0),
        )
        for c in raw_top_income
    ]

    # 7. Top 3 used expense categories (by transaction count)
    raw_top_expense = (
        db.query(
            Category.id,
            Category.name,
            Category.type,
            func.count(Transaction.id).label('txn_count')
        )
        .outerjoin(Transaction, Category.id == Transaction.category_id)
        .filter(Category.is_active == True, Category.type == 'expense')
        .group_by(Category.id, Category.name, Category.type)
        .order_by(desc('txn_count'), Category.name.asc())
        .limit(3)
        .all()
    )

    top_expense_categories = [
        TopCategorySummary(
            id=str(c.id),
            name=c.name,
            type=str(c.type),
            transaction_count=int(c.txn_count or 0),
        )
        for c in raw_top_expense
    ]

    # 8. Latest 3 reported issues sorted by creation date descending
    raw_issues = (
        db.query(SupportReport, User.name, User.email)
        .outerjoin(User, SupportReport.user_id == User.id)
        .order_by(SupportReport.created_at.desc())
        .limit(3)
        .all()
    )

    latest_issues = [
        ReportedIssueSummary(
            id=str(issue.id),
            report_number=issue.report_number,
            title=issue.title,
            description=issue.description,
            report_type=issue.report_type,
            page=issue.page,
            status=str(issue.status),
            created_at=issue.created_at,
            reporter_name=u_name or "Deleted User",
            reporter_email=u_email or "N/A",
        )
        for issue, u_name, u_email in raw_issues
    ]

    # Optional total goals (for backwards compatibility)
    total_goals = db.query(func.count(Goal.id)).scalar() or 0

    return AdminMetricsResponse(
        total_users=total_users,
        total_categories=total_categories,
        income_categories=income_categories,
        expense_categories=expense_categories,
        recent_users=recent_users,
        top_income_categories=top_income_categories,
        top_expense_categories=top_expense_categories,
        latest_issues=latest_issues,
        total_goals=total_goals,
    )
