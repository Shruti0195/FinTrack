import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.models.user import User
from app.models.support_report import SupportReport, SupportReportNote, SupportReportHistory
from app.models.notification import Notification
from app.models.alert_record import AlertRecord
from app.api.deps import get_current_admin_user
from app.services.email_service import send_support_report_update_email

router = APIRouter()

# ========================
# Schemas
# ========================

class AdminIssueListItem(BaseModel):
    id: str
    report_number: int
    title: str
    description: str
    report_type: str
    page: Optional[str] = None
    status: str
    closed_reason: Optional[str] = None
    admin_reply: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reporter_name: str
    reporter_email: str

    class Config:
        from_attributes = True

class AdminIssueCounts(BaseModel):
    all: int
    open: int
    in_progress: int
    resolved: int
    closed: int

class AdminIssueListResponse(BaseModel):
    counts: AdminIssueCounts
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[AdminIssueListItem]

class IssueNoteItem(BaseModel):
    id: str
    admin_name: str
    note: str
    created_at: datetime

class IssueHistoryItem(BaseModel):
    id: str
    actor_type: str
    actor_name: str
    event_type: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    message: Optional[str] = None
    is_internal: bool
    created_at: datetime

class AdminIssueDetailResponse(AdminIssueListItem):
    notes: List[IssueNoteItem]
    history: List[IssueHistoryItem]

class UpdateIssueRequest(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Open|In progress|Resolved|Closed)$")
    closed_reason: Optional[str] = Field(None, max_length=50)
    reply: Optional[str] = Field(None, max_length=1500)
    admin_reply: Optional[str] = Field(None, max_length=1500)
    last_updated_at: Optional[str] = None
    expected_updated_at: Optional[str] = None

class CreateNoteRequest(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)

class SimpleMessage(BaseModel):
    message: str
    success: bool = True


# ========================
# Helper Functions
# ========================

def normalize_status(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    s_clean = s.strip().lower()
    if s_clean in ('open',):
        return 'Open'
    if s_clean in ('in progress', 'in_progress'):
        return 'In progress'
    if s_clean in ('resolved',):
        return 'Resolved'
    if s_clean in ('closed',):
        return 'Closed'
    return s


# ========================
# Endpoints
# ========================

@router.get("", response_model=AdminIssueListResponse)
def get_admin_issues(
    status: Optional[str] = "open",
    search: Optional[str] = None,
    type: Optional[str] = None,
    page_filter: Optional[str] = None,
    sort: Optional[str] = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Returns reported issues with status counts, search, filtering, and pagination.
    Privacy: Exposes only reporter name and email for follow-up. Never exposes financial data.
    """
    # 1. Calculate status counts
    counts_raw = (
        db.query(SupportReport.status, func.count(SupportReport.id))
        .group_by(SupportReport.status)
        .all()
    )
    counts_dict = {"all": 0, "open": 0, "in_progress": 0, "resolved": 0, "closed": 0}
    total_count = 0
    for s_val, count in counts_raw:
        total_count += count
        s_norm = (s_val or "").strip().lower()
        if s_norm == "open":
            counts_dict["open"] += count
        elif s_norm in ("in progress", "in_progress"):
            counts_dict["in_progress"] += count
        elif s_norm == "resolved":
            counts_dict["resolved"] += count
        elif s_norm == "closed":
            counts_dict["closed"] += count
    counts_dict["all"] = total_count

    # 2. Build filtered query
    query = (
        db.query(SupportReport, User.name, User.email)
        .outerjoin(User, SupportReport.user_id == User.id)
    )

    # Status filter
    norm_status = normalize_status(status)
    if norm_status and status.lower() != "all":
        query = query.filter(SupportReport.status == norm_status)

    # Search filter (title, description, reporter name, reporter email, report_number)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        # Check if search is a report number (e.g. #124 or 124)
        num_search = search.strip().lstrip('#')
        filters = [
            SupportReport.title.ilike(term),
            SupportReport.description.ilike(term),
            User.name.ilike(term),
            User.email.ilike(term),
        ]
        if num_search.isdigit():
            filters.append(SupportReport.report_number == int(num_search))
        query = query.filter(or_(*filters))

    # Type filter
    if type and type.lower() != "all":
        query = query.filter(SupportReport.report_type == type.strip())

    # Page filter
    if page_filter and page_filter.strip() and page_filter.lower() != "all":
        query = query.filter(SupportReport.page == page_filter.strip())

    # Sorting
    if sort == "oldest":
        query = query.order_by(SupportReport.created_at.asc())
    else:
        query = query.order_by(SupportReport.created_at.desc())

    total_filtered = query.count()
    total_pages = max(1, (total_filtered + page_size - 1) // page_size)
    offset = (page - 1) * page_size

    results = query.offset(offset).limit(page_size).all()

    items = []
    for report, u_name, u_email in results:
        items.append(
            AdminIssueListItem(
                id=str(report.id),
                report_number=report.report_number or 101,
                title=report.title,
                description=report.description,
                report_type=report.report_type,
                page=report.page,
                status=report.status,
                closed_reason=report.closed_reason,
                admin_reply=report.admin_reply,
                created_at=report.created_at,
                updated_at=report.updated_at,
                reporter_name=u_name or "Deleted User",
                reporter_email=u_email or "N/A",
            )
        )

    return AdminIssueListResponse(
        counts=AdminIssueCounts(**counts_dict),
        total=total_filtered,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items,
    )


@router.get("/{issue_id}", response_model=AdminIssueDetailResponse)
def get_admin_issue_detail(
    issue_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Retrieves full issue detail including internal notes and history timeline.
    """
    try:
        report_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report ID format.")

    result = (
        db.query(SupportReport, User.name, User.email)
        .outerjoin(User, SupportReport.user_id == User.id)
        .filter(SupportReport.id == report_uuid)
        .first()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    report, u_name, u_email = result

    # Fetch notes
    raw_notes = (
        db.query(SupportReportNote)
        .filter(SupportReportNote.report_id == report.id)
        .order_by(SupportReportNote.created_at.asc())
        .all()
    )
    notes = [
        IssueNoteItem(
            id=str(n.id),
            admin_name=n.admin_name,
            note=n.note,
            created_at=n.created_at
        )
        for n in raw_notes
    ]

    # Fetch history
    raw_history = (
        db.query(SupportReportHistory)
        .filter(SupportReportHistory.report_id == report.id)
        .order_by(SupportReportHistory.created_at.asc())
        .all()
    )
    history = [
        IssueHistoryItem(
            id=str(h.id),
            actor_type=h.actor_type,
            actor_name=h.actor_name,
            event_type=h.event_type,
            old_status=h.old_status,
            new_status=h.new_status,
            message=h.message,
            is_internal=h.is_internal,
            created_at=h.created_at
        )
        for h in raw_history
    ]

    return AdminIssueDetailResponse(
        id=str(report.id),
        report_number=report.report_number or 101,
        title=report.title,
        description=report.description,
        report_type=report.report_type,
        page=report.page,
        status=report.status,
        closed_reason=report.closed_reason,
        admin_reply=report.admin_reply,
        created_at=report.created_at,
        updated_at=report.updated_at,
        reporter_name=u_name or "Deleted User",
        reporter_email=u_email or "N/A",
        notes=notes,
        history=history,
    )


@router.patch("/{issue_id}", response_model=AdminIssueDetailResponse)
def update_admin_issue(
    issue_id: str,
    data: UpdateIssueRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Updates report status and/or sends a reply to the user.
    Includes concurrency conflict check, history timeline logging,
    and deduplicated in-app notification + email dispatch.
    """
    try:
        report_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report ID format.")

    report = db.query(SupportReport).filter(SupportReport.id == report_uuid).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    # 1. Optimistic Concurrency Check
    concurrency_ts = data.last_updated_at or data.expected_updated_at
    if concurrency_ts:
        try:
            client_dt = datetime.fromisoformat(concurrency_ts.replace("Z", "+00:00"))
            # If server updated_at is newer than client_dt by > 1.5 seconds
            server_dt = report.updated_at
            if server_dt.tzinfo is None:
                server_dt = server_dt.replace(tzinfo=timezone.utc)
            if (server_dt - client_dt).total_seconds() > 1.5:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This report was modified by another administrator since you opened it. Please refresh the panel to review the latest changes."
                )
        except ValueError:
            pass

    user = db.query(User).filter(User.id == report.user_id).first()
    old_status = report.status
    has_status_change = False
    new_status = data.status

    # 2. Status change handling
    if new_status and new_status != old_status:
        has_status_change = True
        if new_status == "Closed":
            valid_reasons = ["Duplicate", "Not a bug", "Can't reproduce", "Won't do", "Other"]
            if not data.closed_reason or data.closed_reason not in valid_reasons:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Closing a report requires a reason: {', '.join(valid_reasons)}."
                )
            report.closed_reason = data.closed_reason
            report.closed_at = datetime.now(timezone.utc)
        elif new_status == "Resolved":
            report.resolved_at = datetime.now(timezone.utc)
            report.closed_reason = None
        else:
            report.closed_reason = None

        report.status = new_status
        report.updated_at = datetime.now(timezone.utc)

        # Log status change in history
        history_msg = f"Status changed from {old_status} to {new_status}"
        if new_status == "Closed" and report.closed_reason:
            history_msg += f" (Reason: {report.closed_reason})"

        hist_entry = SupportReportHistory(
            report_id=report.id,
            actor_type="ADMIN",
            actor_name=admin.name or "Admin",
            event_type="status_changed",
            old_status=old_status,
            new_status=new_status,
            message=history_msg,
            is_internal=False,
        )
        db.add(hist_entry)

    # 3. User reply handling
    has_new_reply = False
    raw_reply = data.reply if data.reply is not None else data.admin_reply
    if raw_reply is not None and raw_reply.strip():
        clean_reply = raw_reply.strip()
        report.admin_reply = clean_reply
        report.admin_reply_at = datetime.now(timezone.utc)
        report.updated_at = datetime.now(timezone.utc)
        has_new_reply = True

        # Log reply in history
        reply_hist = SupportReportHistory(
            report_id=report.id,
            actor_type="ADMIN",
            actor_name=admin.name or "Admin",
            event_type="reply_sent",
            message=clean_reply,
            is_internal=False,
        )
        db.add(reply_hist)

    db.add(report)
    db.commit()
    db.refresh(report)

    # 4. Notifications & Email (Deduplicated via AlertRecord)
    if user and (has_status_change or has_new_reply):
        # Build unique deterministic alert key for this update
        reply_hash = hashlib.md5((report.admin_reply or "").encode("utf-8")).hexdigest()[:8]
        alert_key = f"support_report:{report.id}:{report.status}:{reply_hash}"

        already_sent = db.query(AlertRecord).filter(
            AlertRecord.user_id == user.id,
            AlertRecord.alert_key == alert_key
        ).first()

        if not already_sent:
            # Create in-app notification
            notif_msg = f"Your report '{report.title}' has been updated to {report.status}."
            if has_new_reply:
                notif_msg = f"New message from FinTrack team on your report '{report.title}'."

            new_notif = Notification(
                user_id=user.id,
                type="support_update",
                title=f"Report #{report.report_number or 101} Updated",
                message=notif_msg,
                target_tab="help"
            )
            db.add(new_notif)

            # Record in AlertRecord
            alert_rec = AlertRecord(
                user_id=user.id,
                alert_type="support_update",
                alert_key=alert_key,
                in_app_sent_at=datetime.now(timezone.utc)
            )
            db.add(alert_rec)

            # Send Email if status is Resolved or Closed, or if reply sent
            if report.status in ("Resolved", "Closed") or has_new_reply:
                background_tasks.add_task(
                    send_support_report_update_email,
                    email_to=user.email,
                    user_name=user.name,
                    report_title=report.title,
                    status=report.status,
                    reply=report.admin_reply or ""
                )
                alert_rec.email_sent_at = datetime.now(timezone.utc)

            db.commit()

    return get_admin_issue_detail(issue_id=str(report.id), db=db, admin=admin)


@router.post("/{issue_id}/notes", response_model=IssueNoteItem)
def add_admin_note(
    issue_id: str,
    data: CreateNoteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Adds an internal note visible ONLY to admins. Users never see this.
    """
    try:
        report_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report ID format.")

    report = db.query(SupportReport).filter(SupportReport.id == report_uuid).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    new_note = SupportReportNote(
        report_id=report.id,
        admin_id=admin.id,
        admin_name=admin.name or "Admin",
        note=data.note.strip()
    )
    db.add(new_note)

    # Log in history as internal
    hist = SupportReportHistory(
        report_id=report.id,
        actor_type="ADMIN",
        actor_name=admin.name or "Admin",
        event_type="note_added",
        message=f"Added internal note: {data.note.strip()[:60]}...",
        is_internal=True
    )
    db.add(hist)

    report.updated_at = datetime.now(timezone.utc)
    db.add(report)
    db.commit()
    db.refresh(new_note)

    return IssueNoteItem(
        id=str(new_note.id),
        admin_name=new_note.admin_name,
        note=new_note.note,
        created_at=new_note.created_at
    )


@router.post("/{issue_id}/reopen", response_model=AdminIssueDetailResponse)
def reopen_admin_issue(
    issue_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Moves a Resolved or Closed issue back to Open.
    """
    try:
        report_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report ID format.")

    report = db.query(SupportReport).filter(SupportReport.id == report_uuid).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    old_status = report.status
    report.status = "Open"
    report.closed_reason = None
    report.updated_at = datetime.now(timezone.utc)

    hist = SupportReportHistory(
        report_id=report.id,
        actor_type="ADMIN",
        actor_name=admin.name or "Admin",
        event_type="reopened",
        old_status=old_status,
        new_status="Open",
        message=f"Report reopened by {admin.name or 'Admin'}",
        is_internal=False
    )
    db.add(hist)
    db.add(report)
    db.commit()

    # User in-app notification
    user = db.query(User).filter(User.id == report.user_id).first()
    if user:
        alert_key = f"support_report:{report.id}:reopened:{int(report.updated_at.timestamp())}"
        already_sent = db.query(AlertRecord).filter(
            AlertRecord.user_id == user.id,
            AlertRecord.alert_key == alert_key
        ).first()
        if not already_sent:
            new_notif = Notification(
                user_id=user.id,
                type="support_update",
                title=f"Report #{report.report_number or 101} Reopened",
                message=f"Your report '{report.title}' was reopened by the FinTrack team for further review.",
                target_tab="help"
            )
            db.add(new_notif)
            alert_rec = AlertRecord(
                user_id=user.id,
                alert_type="support_update",
                alert_key=alert_key,
                in_app_sent_at=datetime.now(timezone.utc)
            )
            db.add(alert_rec)
            db.commit()

    return get_admin_issue_detail(issue_id=str(report.id), db=db, admin=admin)


@router.delete("/{issue_id}", response_model=SimpleMessage)
def delete_spam_issue(
    issue_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Permanently deletes spam reports.
    Normal issues are closed, not deleted.
    """
    try:
        report_uuid = uuid.UUID(issue_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report ID format.")

    report = db.query(SupportReport).filter(SupportReport.id == report_uuid).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    db.delete(report)
    db.commit()
    return SimpleMessage(message="Report permanently deleted.")


@router.post("/cleanup-retention", response_model=Dict[str, Any])
def run_retention_cleanup(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Automatically removes Resolved or Closed reports older than 12 months (365 days).
    Open and In progress reports are NEVER deleted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    deleted_count = (
        db.query(SupportReport)
        .filter(
            SupportReport.status.in_(["Resolved", "Closed"]),
            SupportReport.created_at < cutoff
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return {
        "success": True,
        "removed_count": deleted_count,
        "cutoff_date": cutoff.isoformat(),
        "message": f"Successfully removed {deleted_count} resolved/closed reports older than 12 months."
    }
