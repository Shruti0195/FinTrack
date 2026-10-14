import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.sql import func
from app.core.database import Base

user_role_enum = ENUM('USER', 'ADMIN', name='user_role', create_type=False)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(user_role_enum, nullable=False, default='USER')
    is_active = Column(Boolean, nullable=False, default=False)  # Inactive until email is verified
    is_verified = Column(Boolean, nullable=False, default=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    email_alerts_enabled = Column(Boolean, nullable=False, default=True)
    email_budget_alerts = Column(Boolean, nullable=False, default=True)
    goal_milestone_notifs = Column(Boolean, nullable=False, default=True)
    monthly_report_notifs = Column(Boolean, nullable=False, default=True)

    # Budget alert defaults
    budget_alert_thresholds = Column(JSONB, nullable=True, default=[80, 100])
    budget_alert_in_app = Column(Boolean, nullable=False, default=True)
    budget_alert_email = Column(Boolean, nullable=False, default=True)

    # Goal alert defaults
    goal_milestone_thresholds = Column(JSONB, nullable=True, default=[25, 50, 75, 100])
    goal_deadline_reminder_days = Column(Integer, nullable=True, default=7)
    goal_inactivity_nudge_days = Column(Integer, nullable=True, default=30)
    goal_alert_in_app = Column(Boolean, nullable=False, default=True)
    goal_alert_email = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @property
    def is_admin(self) -> bool:
        return self.role == 'ADMIN'


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
