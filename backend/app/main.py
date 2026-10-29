from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

# Import all models to ensure SQLAlchemy mapper registry knows about every relationship
import app.models.user
import app.models.category
import app.models.transaction
import app.models.budget
import app.models.goal
import app.models.analytics
import app.models.notification
import app.models.alert_record
import app.models.admin
import app.models.support_report
from sqlalchemy import text
from app.core.database import engine

def ensure_columns():
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS email_budget_alerts BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS goal_milestone_notifs BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS monthly_report_notifs BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS viewed_analytics BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS help_checklist_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1,
                ADD COLUMN IF NOT EXISTS failed_password_attempts INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS password_attempt_locked_until TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS budget_alerts_paused BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS budget_alerts_paused_until TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS goal_alerts_paused BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS goal_alerts_paused_until TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS tour_completed_version INTEGER NOT NULL DEFAULT 0;
            """))
            conn.execute(text("""
                ALTER TABLE notifications 
                ADD COLUMN IF NOT EXISTS title VARCHAR(100),
                ADD COLUMN IF NOT EXISTS target_tab VARCHAR(50) DEFAULT 'dashboard';
            """))
            try:
                conn.execute(text("""
                    ALTER TABLE notifications 
                    ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR(50);
                """))
            except Exception:
                pass
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
                ALTER TABLE alert_records ADD COLUMN IF NOT EXISTS skipped_reason VARCHAR(100);
                CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_record_user_key ON alert_records(user_id, alert_key);
                CREATE INDEX IF NOT EXISTS ix_alert_record_user_type ON alert_records(user_id, alert_type);
                CREATE INDEX IF NOT EXISTS ix_alert_record_budget ON alert_records(budget_id);
                CREATE INDEX IF NOT EXISTS ix_alert_record_goal ON alert_records(goal_id);

                CREATE TABLE IF NOT EXISTS support_reports (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    report_type VARCHAR(50) NOT NULL,
                    title VARCHAR(150) NOT NULL,
                    description TEXT NOT NULL,
                    page VARCHAR(50),
                    status VARCHAR(30) NOT NULL DEFAULT 'Open',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_support_reports_user_id ON support_reports(user_id);
                CREATE INDEX IF NOT EXISTS ix_support_reports_status ON support_reports(status);
                CREATE INDEX IF NOT EXISTS ix_support_reports_created_at ON support_reports(created_at);

                -- Migration: Copy page-level settings to individual cards for existing budgets
                UPDATE budgets b
                SET 
                    has_custom_alerts = TRUE,
                    custom_alert_thresholds = COALESCE(b.custom_alert_thresholds, u.budget_alert_thresholds, '[80, 100]'::jsonb),
                    custom_alert_in_app = COALESCE(b.custom_alert_in_app, u.budget_alert_in_app, TRUE),
                    custom_alert_email = COALESCE(b.custom_alert_email, u.budget_alert_email, TRUE)
                FROM users u
                WHERE b.user_id = u.id AND (b.has_custom_alerts IS FALSE OR b.custom_alert_thresholds IS NULL);

                -- Migration: Copy page-level settings to individual cards for existing goals
                UPDATE goals g
                SET 
                    has_custom_alerts = TRUE,
                    custom_milestone_thresholds = COALESCE(g.custom_milestone_thresholds, u.goal_milestone_thresholds, '[25, 50, 75, 100]'::jsonb),
                    custom_deadline_reminder_days = COALESCE(g.custom_deadline_reminder_days, u.goal_deadline_reminder_days, 7),
                    custom_inactivity_nudge_days = COALESCE(g.custom_inactivity_nudge_days, u.goal_inactivity_nudge_days, 30),
                    custom_alert_in_app = COALESCE(g.custom_alert_in_app, u.goal_alert_in_app, TRUE),
                    custom_alert_email = COALESCE(g.custom_alert_email, u.goal_alert_email, TRUE)
                FROM users u
                WHERE g.user_id = u.id AND (g.has_custom_alerts IS FALSE OR g.custom_milestone_thresholds IS NULL);
            """))
            conn.commit()
    except Exception as e:
        print(f"[DB INIT NOTE] Schema auto-ensure: {e}")

ensure_columns()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": "FinTrack API",
        "database": "PostgreSQL (fintrack_db)",
        "docs": "/docs",
    }
