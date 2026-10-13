import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.sql import func
from app.core.database import Base

notif_type_enum = ENUM('budget_80', 'budget_100', 'goal_completed', 'system', name='notification_type', create_type=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    budget_id = Column(UUID(as_uuid=True), ForeignKey("budgets.id", ondelete="CASCADE"), nullable=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=True)
    type = Column(String(50), nullable=False)  # budget_80, budget_100, goal_milestone, goal_deadline, monthly_report, system
    title = Column(String(100), nullable=True)
    message = Column(String(500), nullable=False)
    target_tab = Column(String(50), nullable=True, default='dashboard')  # budgets, goals, dashboard, reports
    is_read = Column(Boolean, nullable=False, default=False)
    email_sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
