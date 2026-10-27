import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

class AlertRecord(Base):
    __tablename__ = "alert_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)  # 'budget_threshold', 'goal_milestone', 'goal_deadline', 'goal_inactivity', 'monthly_report', 'income_expense'
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id", ondelete="CASCADE"), nullable=True, index=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=True, index=True)
    threshold = Column(Integer, nullable=True)  # e.g., 80, 100, 25, 7, 3, 0
    period_identifier = Column(String(50), nullable=True)  # '2026-10', '2026-10-17', etc.
    alert_key = Column(String(160), nullable=False)  # Unique per user: deterministic key
    in_app_sent_at = Column(DateTime(timezone=True), nullable=True)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    skipped_reason = Column(String(100), nullable=True)  # e.g. 'skipped because paused'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'alert_key', name='uq_alert_record_user_key'),
        Index('ix_alert_record_user_type', 'user_id', 'alert_type'),
    )
