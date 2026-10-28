import uuid
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import Goal
from app.models.support_report import SupportReport, SupportReportHistory
from app.schemas.help import (
    ChecklistStatus,
    SupportReportCreate,
    SupportReportOut,
    UserReportDetailOut,
    UserReportHistoryItem,
    SimpleMessageResponse
)
from app.services.email_service import send_support_report_email

router = APIRouter()

@router.get("/checklist", response_model=ChecklistStatus)
def get_checklist_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the user's getting-started onboarding checklist status.
    Ticks off steps when user has added >= 1 income, >= 1 expense,
    >= 1 budget, >= 1 goal, and viewed Analytics.
    """
    has_income = db.query(Transaction.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == 'income'
    ).first() is not None

    has_expense = db.query(Transaction.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == 'expense'
    ).first() is not None

    has_budget = db.query(Budget.id).filter(
        Budget.user_id == current_user.id
    ).first() is not None

    has_goal = db.query(Goal.id).filter(
        Goal.user_id == current_user.id
    ).first() is not None

    has_viewed_analytics = bool(getattr(current_user, 'viewed_analytics', False))

    completed_count = sum([has_income, has_expense, has_budget, has_goal, has_viewed_analytics])
    all_completed = (completed_count == 5)
    is_dismissed = bool(getattr(current_user, 'help_checklist_dismissed', False))

    return ChecklistStatus(
        has_income=has_income,
        has_expense=has_expense,
        has_budget=has_budget,
        has_goal=has_goal,
        has_viewed_analytics=has_viewed_analytics,
        completed_count=completed_count,
        total_count=5,
        all_completed=all_completed,
        is_dismissed=is_dismissed
    )

@router.post("/dismiss-checklist", response_model=SimpleMessageResponse)
def dismiss_checklist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Marks the getting started checklist as permanently dismissed once all 5 steps are completed.
    """
    current_user.help_checklist_dismissed = True
    db.add(current_user)
    db.commit()
    return SimpleMessageResponse(message="Checklist dismissed successfully.")

@router.post("/track-analytics", response_model=SimpleMessageResponse)
def track_analytics_view(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Marks that the user has viewed the Analytics page for checklist completion.
    """
    if not current_user.viewed_analytics:
        current_user.viewed_analytics = True
        db.add(current_user)
        db.commit()
    return SimpleMessageResponse(message="Analytics view tracked.")

@router.get("/reports", response_model=List[SupportReportOut])
def get_user_support_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the list of support reports and suggestions submitted by the current user.
    Strict Privacy: Users only ever see their own reports.
    """
    reports = db.query(SupportReport).filter(
        SupportReport.user_id == current_user.id
    ).order_by(SupportReport.created_at.desc()).all()
    return reports

@router.get("/reports/{report_id}", response_model=UserReportDetailOut)
def get_user_support_report_detail(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns full details of a specific user report including public timeline history.
    Strict Privacy:
    - Users see only their own reports.
    - Never exposes internal notes.
    - Masks any admin actor names to 'FinTrack team'.
    """
    try:
        report_uuid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report ID format.")

    report = db.query(SupportReport).filter(
        SupportReport.id == report_uuid,
        SupportReport.user_id == current_user.id
    ).first()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    # Fetch public history events ONLY (exclude is_internal)
    raw_history = (
        db.query(SupportReportHistory)
        .filter(
            SupportReportHistory.report_id == report.id,
            SupportReportHistory.is_internal == False
        )
        .order_by(SupportReportHistory.created_at.asc())
        .all()
    )

    history = [
        UserReportHistoryItem(
            id=str(h.id),
            actor_name="FinTrack team" if h.actor_type == "ADMIN" else current_user.name,
            event_type=h.event_type,
            old_status=h.old_status,
            new_status=h.new_status,
            message=h.message,
            created_at=h.created_at
        )
        for h in raw_history
    ]

    return UserReportDetailOut(
        id=report.id,
        report_number=report.report_number or 101,
        report_type=report.report_type,
        title=report.title,
        description=report.description,
        page=report.page,
        status=report.status,
        closed_reason=report.closed_reason,
        admin_reply=report.admin_reply,
        admin_reply_at=report.admin_reply_at,
        created_at=report.created_at,
        updated_at=report.updated_at,
        history=history,
    )

@router.post("/reports", response_model=SupportReportOut, status_code=status.HTTP_201_CREATED)
def submit_support_report(
    report_in: SupportReportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a new support report or suggestion.
    Rate limited to 5 submissions per 24 hours per user.
    Dispatches a notification email to the support team in the background.
    """
    # Rate limit: 5 reports in the last 24 hours
    since_24h = datetime.now(timezone.utc) - timedelta(days=1)
    daily_count = db.query(SupportReport).filter(
        SupportReport.user_id == current_user.id,
        SupportReport.created_at >= since_24h
    ).count()

    if daily_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You have reached the daily limit of 5 reports. Please try again tomorrow."
        )

    clean_title = report_in.title.strip()
    clean_desc = report_in.description.strip()
    clean_page = report_in.page.strip() if report_in.page else None

    if len(clean_title) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title must be at least 3 characters."
        )

    if len(clean_desc) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description must be at least 10 characters."
        )

    new_report = SupportReport(
        user_id=current_user.id,
        report_type=report_in.report_type,
        title=clean_title,
        description=clean_desc,
        page=clean_page,
        status="Open"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Initial history timeline entry
    init_hist = SupportReportHistory(
        report_id=new_report.id,
        actor_type="USER",
        actor_name=current_user.name,
        event_type="created",
        message="Report submitted",
        is_internal=False
    )
    db.add(init_hist)
    db.commit()

    # Dispatch email notification to support team in background
    background_tasks.add_task(
        send_support_report_email,
        user_name=current_user.name,
        user_email=current_user.email,
        report_type=new_report.report_type,
        title=new_report.title,
        description=new_report.description,
        page=new_report.page
    )

    return new_report
