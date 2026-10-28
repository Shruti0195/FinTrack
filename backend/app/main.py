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
                ADD COLUMN IF NOT EXISTS budget_alert_thresholds JSONB DEFAULT '[80, 100]'::jsonb,
                ADD COLUMN IF NOT EXISTS budget_alert_in_app BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS budget_alert_email BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS goal_milestone_thresholds JSONB DEFAULT '[25, 50, 75, 100]'::jsonb,
                ADD COLUMN IF NOT EXISTS goal_deadline_reminder_days INTEGER DEFAULT 7,
                ADD COLUMN IF NOT EXISTS goal_inactivity_nudge_days INTEGER DEFAULT 30,
                ADD COLUMN IF NOT EXISTS goal_alert_in_app BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS goal_alert_email BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS viewed_analytics BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS help_checklist_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1,
                ADD COLUMN IF NOT EXISTS failed_password_attempts INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS password_attempt_locked_until TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS budget_alerts_paused BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS budget_alerts_paused_until TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS goal_alerts_paused BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS goal_alerts_paused_until TIMESTAMPTZ;

                ALTER TABLE budgets
                ADD COLUMN IF NOT EXISTS has_custom_alerts BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS custom_alert_thresholds JSONB,
                ADD COLUMN IF NOT EXISTS custom_alert_in_app BOOLEAN DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS custom_alert_email BOOLEAN DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS alert_baseline_pct NUMERIC(6, 2) DEFAULT 0.0;

                ALTER TABLE goals
                ADD COLUMN IF NOT EXISTS has_custom_alerts BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS custom_milestone_thresholds JSONB,
                ADD COLUMN IF NOT EXISTS custom_deadline_reminder_days INTEGER DEFAULT 7,
                ADD COLUMN IF NOT EXISTS custom_inactivity_nudge_days INTEGER DEFAULT 30,
                ADD COLUMN IF NOT EXISTS custom_alert_in_app BOOLEAN DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS custom_alert_email BOOLEAN DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS alert_baseline_pct NUMERIC(6, 2) DEFAULT 0.0;

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

                CREATE SEQUENCE IF NOT EXISTS support_report_num_seq START 101;

                ALTER TABLE support_reports
                ADD COLUMN IF NOT EXISTS report_number INTEGER DEFAULT nextval('support_report_num_seq'),
                ADD COLUMN IF NOT EXISTS closed_reason VARCHAR(50),
                ADD COLUMN IF NOT EXISTS admin_reply TEXT,
                ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

                UPDATE support_reports
                SET report_number = nextval('support_report_num_seq')
                WHERE report_number IS NULL;

                CREATE UNIQUE INDEX IF NOT EXISTS ix_support_reports_report_num ON support_reports(report_number);

                CREATE TABLE IF NOT EXISTS support_report_notes (
                    id UUID PRIMARY KEY,
                    report_id UUID NOT NULL REFERENCES support_reports(id) ON DELETE CASCADE,
                    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    admin_name VARCHAR(150) NOT NULL DEFAULT 'Admin',
                    note TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_support_report_notes_report_id ON support_report_notes(report_id);

                CREATE TABLE IF NOT EXISTS support_report_history (
                    id UUID PRIMARY KEY,
                    report_id UUID NOT NULL REFERENCES support_reports(id) ON DELETE CASCADE,
                    actor_type VARCHAR(20) NOT NULL,
                    actor_name VARCHAR(150) NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    old_status VARCHAR(30),
                    new_status VARCHAR(30),
                    message TEXT,
                    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS ix_support_report_history_report_id ON support_report_history(report_id);

                ALTER TABLE reported_issues
                ADD COLUMN IF NOT EXISTS page VARCHAR(100),
                ADD COLUMN IF NOT EXISTS admin_note TEXT;

                CREATE TABLE IF NOT EXISTS goal_icons (
                    id UUID PRIMARY KEY,
                    name VARCHAR(60) NOT NULL UNIQUE,
                    icon_key VARCHAR(50) NOT NULL UNIQUE,
                    is_default BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS goal_colors (
                    id UUID PRIMARY KEY,
                    name VARCHAR(60) NOT NULL UNIQUE,
                    hex VARCHAR(10) NOT NULL UNIQUE,
                    is_default BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                -- Seed default goal icons if empty
                INSERT INTO goal_icons (id, name, icon_key, is_default)
                SELECT gen_random_uuid(), val.name, val.icon_key, TRUE
                FROM (VALUES 
                    ('Target', 'target'),
                    ('Phone', 'phone'),
                    ('Travel', 'plane'),
                    ('Emergency', 'shield'),
                    ('Home', 'home'),
                    ('Vehicle', 'car'),
                    ('Gadget', 'laptop'),
                    ('Gift', 'gift'),
                    ('Dream', 'sparkles'),
                    ('Personal', 'heart')
                ) AS val(name, icon_key)
                WHERE NOT EXISTS (SELECT 1 FROM goal_icons LIMIT 1);

                -- Seed default goal colors if empty
                INSERT INTO goal_colors (id, name, hex, is_default)
                SELECT gen_random_uuid(), val.name, val.hex, TRUE
                FROM (VALUES 
                    ('Emerald Green', '#10B981'),
                    ('Deep Navy', '#0F172A'),
                    ('Royal Blue', '#3B82F6'),
                    ('Violet', '#8B5CF6'),
                    ('Rose', '#EC4899'),
                    ('Amber', '#F59E0B')
                ) AS val(name, hex)
                WHERE NOT EXISTS (SELECT 1 FROM goal_colors LIMIT 1);

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
