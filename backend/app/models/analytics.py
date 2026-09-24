import uuid
from sqlalchemy import Column, String, SmallInteger, Numeric, Text, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.sql import func
from app.core.database import Base

insight_severity_enum = ENUM('positive', 'warning', 'negative', name='insight_severity', create_type=False)

class FinancialHealthScore(Base):
    __tablename__ = "financial_health_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    year = Column(SmallInteger, nullable=False)
    savings_rate_score = Column(SmallInteger, nullable=False)
    budget_adherence_score = Column(SmallInteger, nullable=False)
    expense_stability_score = Column(SmallInteger, nullable=False)
    essential_mix_score = Column(SmallInteger, nullable=False)
    debt_behavior_score = Column(SmallInteger, nullable=False)
    total_score = Column(SmallInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'month', 'year', name='uq_health_score_user_month_year'),
        CheckConstraint(
            'savings_rate_score + budget_adherence_score + expense_stability_score + essential_mix_score + debt_behavior_score = total_score',
            name='chk_health_score_sum'
        ),
    )


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    year = Column(SmallInteger, nullable=False)
    severity = Column(insight_severity_enum, nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    year = Column(SmallInteger, nullable=False)
    total_income = Column(Numeric(12, 2), nullable=False)
    total_expense = Column(Numeric(12, 2), nullable=False)
    total_savings = Column(Numeric(12, 2), nullable=False)
    health_score = Column(SmallInteger, nullable=True)
    summary_text = Column(Text, nullable=True)
    pdf_path = Column(String(255), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'month', 'year', name='uq_ai_report_user_month_year'),
    )
