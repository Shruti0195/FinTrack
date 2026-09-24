from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.api.deps import get_current_admin_user

router = APIRouter()

@router.get("/metrics")
def get_system_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """
    ADMIN ONLY: Returns high-level platform statistics.
    Never exposes individual private transaction data.
    """
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_txns = db.query(func.count(Transaction.id)).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "disabled_users": total_users - active_users,
        "total_transactions": total_txns,
    }
