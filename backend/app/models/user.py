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

    # Alert Pause States
    budget_alerts_paused = Column(Boolean, nullable=False, default=False)
    budget_alerts_paused_until = Column(DateTime(timezone=True), nullable=True)
    goal_alerts_paused = Column(Boolean, nullable=False, default=False)
    goal_alerts_paused_until = Column(DateTime(timezone=True), nullable=True)

    # Help & Onboarding checklist
    viewed_analytics = Column(Boolean, nullable=False, default=False)
    help_checklist_dismissed = Column(Boolean, nullable=False, default=False)

    # Security & multi-device session invalidation
    token_version = Column(Integer, nullable=False, default=1)
    failed_password_attempts = Column(Integer, nullable=False, default=0)
    password_attempt_locked_until = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @property
    def is_admin(self) -> bool:
        return self.role == 'ADMIN'

    def is_budget_alerts_paused(self, now=None) -> bool:
        if not self.budget_alerts_paused:
            return False
        if self.budget_alerts_paused_until is None:
            return True
        from datetime import datetime, timezone
        curr = now or datetime.now(timezone.utc)
        return self.budget_alerts_paused_until > curr

    def is_goal_alerts_paused(self, now=None) -> bool:
        if not self.goal_alerts_paused:
            return False
        if self.goal_alerts_paused_until is None:
            return True
        from datetime import datetime, timezone
        curr = now or datetime.now(timezone.utc)
        return self.goal_alerts_paused_until > curr


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
