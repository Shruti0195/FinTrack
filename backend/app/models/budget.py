import uuid
from sqlalchemy import Column, SmallInteger, Numeric, DateTime, ForeignKey, ForeignKeyConstraint, UniqueConstraint, Boolean
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.sql import func
from app.core.database import Base

txn_type_enum = ENUM('income', 'expense', name='txn_type', create_type=False)

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), nullable=False)
    type = Column(txn_type_enum, nullable=False, default='expense')
    month = Column(SmallInteger, nullable=False)
    year = Column(SmallInteger, nullable=False)
    limit_amount = Column(Numeric(12, 2), nullable=False)

    # Custom alert overrides
    has_custom_alerts = Column(Boolean, nullable=False, default=False)
    custom_alert_thresholds = Column(JSONB, nullable=True)
    custom_alert_in_app = Column(Boolean, nullable=True)
    custom_alert_email = Column(Boolean, nullable=True)
    alert_baseline_pct = Column(Numeric(6, 2), nullable=True, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'category_id', 'month', 'year', name='uq_budget_user_cat_month_year'),
        ForeignKeyConstraint(
            ['category_id', 'type'],
            ['categories.id', 'categories.type'],
            ondelete='RESTRICT',
        ),
    )
