import uuid
from sqlalchemy import text
from app.core.database import SessionLocal, engine
import app.models.user
import app.models.category
import app.models.transaction
import app.models.budget
import app.models.goal
import app.models.notification
import app.models.alert_record

from app.models.notification import Notification
from app.models.budget import Budget
from app.models.goal import Goal
from app.models.alert_record import AlertRecord

def migrate():
    print("Migrating and creating alert_records table...")
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS alert_records (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                alert_type VARCHAR(50) NOT NULL,
                budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
                goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
                threshold INTEGER,
                period_identifier VARCHAR(50),
                alert_key VARCHAR(160) NOT NULL,
                in_app_sent_at TIMESTAMPTZ,
                email_sent_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_record_user_key ON alert_records(user_id, alert_key);
            CREATE INDEX IF NOT EXISTS ix_alert_record_user_type ON alert_records(user_id, alert_type);
            CREATE INDEX IF NOT EXISTS ix_alert_record_budget ON alert_records(budget_id);
            CREATE INDEX IF NOT EXISTS ix_alert_record_goal ON alert_records(goal_id);
        """))
        conn.commit()
    print("Table and indexes verified.")

    db = SessionLocal()
    try:
        notifications = db.query(Notification).order_by(Notification.created_at.asc()).all()
        print(f"Found {len(notifications)} existing notifications to backfill.")
        
        backfilled_count = 0
        skipped_count = 0

        for n in notifications:
            ntype = n.type or ""
            alert_type = None
            threshold = None
            period_identifier = None
            alert_key = None
            b_id = n.budget_id
            g_id = n.goal_id

            if ntype.startswith("budget_"):
                alert_type = "budget_threshold"
                parts = ntype.split("_")
                threshold = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 80
                if b_id:
                    b = db.query(Budget).filter(Budget.id == b_id).first()
                    if b:
                        period_identifier = f"{b.year}-{b.month:02d}"
                    else:
                        period_identifier = f"{n.created_at.year}-{n.created_at.month:02d}"
                    alert_key = f"budget:{b_id}:{threshold}:{period_identifier}"
            elif ntype.startswith("goal_milestone"):
                alert_type = "goal_milestone"
                parts = ntype.split("_")
                threshold = int(parts[2]) if len(parts) >= 3 and parts[2].isdigit() else 100
                period_identifier = "all_time"
                if g_id:
                    alert_key = f"goal_milestone:{g_id}:{threshold}"
            elif ntype.startswith("goal_deadline"):
                alert_type = "goal_deadline"
                parts = ntype.split("_")
                threshold = int(parts[2]) if len(parts) >= 3 and parts[2].isdigit() else 7
                if g_id:
                    g = db.query(Goal).filter(Goal.id == g_id).first()
                    if g and g.deadline:
                        period_identifier = str(g.deadline)
                    else:
                        period_identifier = str(n.created_at.date())
                    alert_key = f"goal_deadline:{g_id}:{threshold}:{period_identifier}"
            elif ntype.startswith("goal_inactive"):
                alert_type = "goal_inactivity"
                parts = ntype.split("_")
                threshold = int(parts[2]) if len(parts) >= 3 and parts[2].isdigit() else 30
                period_identifier = str(n.created_at.date())
                if g_id:
                    alert_key = f"goal_inactive:{g_id}:{threshold}:{period_identifier}"
            elif ntype == "monthly_report":
                alert_type = "monthly_report"
                threshold = None
                period_identifier = f"{n.created_at.year}-{n.created_at.month:02d}"
                alert_key = f"monthly_report:{period_identifier}"
            elif ntype.startswith("income_expense"):
                alert_type = "income_expense"
                parts = ntype.split("_")
                threshold = int(parts[2]) if len(parts) >= 3 and parts[2].isdigit() else 100
                period_identifier = f"{n.created_at.year}-{n.created_at.month:02d}"
                alert_key = f"income_expense:{threshold}:{period_identifier}"
            elif ntype == "system":
                alert_type = "system"
                alert_key = f"system:{n.id}"
            
            if not alert_key:
                skipped_count += 1
                continue

            # Check if record already exists
            existing = db.query(AlertRecord).filter(
                AlertRecord.user_id == n.user_id,
                AlertRecord.alert_key == alert_key
            ).first()

            if not existing:
                rec = AlertRecord(
                    id=uuid.uuid4(),
                    user_id=n.user_id,
                    alert_type=alert_type,
                    budget_id=b_id,
                    goal_id=g_id,
                    threshold=threshold,
                    period_identifier=period_identifier,
                    alert_key=alert_key,
                    in_app_sent_at=n.created_at,
                    email_sent_at=n.email_sent_at,
                    created_at=n.created_at
                )
                db.add(rec)
                try:
                    db.commit()
                    backfilled_count += 1
                except Exception as e:
                    print(f"Failed to insert record {alert_key}: {e}")
                    db.rollback()
                    skipped_count += 1
            else:
                skipped_count += 1

        print(f"Backfill complete! Backfilled: {backfilled_count}, Skipped/Duplicates: {skipped_count}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
