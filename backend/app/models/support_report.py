import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean, Sequence
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base

report_num_seq = Sequence('support_report_num_seq', start=101)

class SupportReport(Base):
    __tablename__ = "support_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_number = Column(Integer, report_num_seq, server_default=report_num_seq.next_value(), unique=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_type = Column(String(50), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    page = Column(String(50), nullable=True)
    status = Column(String(30), nullable=False, default="Open", index=True)
    closed_reason = Column(String(50), nullable=True)
    admin_reply = Column(Text, nullable=True)
    admin_reply_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SupportReportNote(Base):
    __tablename__ = "support_report_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("support_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    admin_name = Column(String(150), nullable=False, default="Admin")
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SupportReportHistory(Base):
    __tablename__ = "support_report_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("support_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_type = Column(String(20), nullable=False)  # 'USER', 'ADMIN', 'SYSTEM'
    actor_name = Column(String(150), nullable=False)
    event_type = Column(String(50), nullable=False)  # 'created', 'status_changed', 'reply_sent', 'note_added', 'reopened'
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    message = Column(Text, nullable=True)
    is_internal = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
