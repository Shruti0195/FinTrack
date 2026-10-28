from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.admin import ReportedIssue
from app.api.deps import get_current_user

router = APIRouter()

class ReportProblemRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=150)
    description: str = Field(..., min_length=3, max_length=5000)
    page: Optional[str] = Field(None, max_length=100)

class ReportProblemResponse(BaseModel):
    success: bool
    message: str
    issue_id: str

@router.post("", response_model=ReportProblemResponse, status_code=status.HTTP_201_CREATED)
def report_a_problem(
    data: ReportProblemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Allows an authenticated user to report a problem or issue.
    After sending, returns a friendly thank-you message.
    """
    clean_desc = data.description.strip()
    if not clean_desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a short description of what went wrong."
        )

    # Derive title if not explicitly provided
    title = data.title.strip() if data.title and data.title.strip() else None
    if not title:
        first_line = clean_desc.split("\n")[0]
        title = (first_line[:57] + "...") if len(first_line) > 60 else first_line
        if not title:
            title = "Reported issue"

    issue = ReportedIssue(
        user_id=current_user.id,
        title=title,
        description=clean_desc,
        page=data.page.strip() if data.page and data.page.strip() else None,
        status='open'
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    return ReportProblemResponse(
        success=True,
        message="Thank you for reporting this! Our team has received your report and will look into it.",
        issue_id=str(issue.id)
    )
