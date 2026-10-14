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
from sqlalchemy import text
from app.core.database import engine

def ensure_columns():
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS email_budget_alerts BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS goal_milestone_notifs BOOLEAN NOT NULL DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS monthly_report_notifs BOOLEAN NOT NULL DEFAULT TRUE;
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
                CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_record_user_key ON alert_records(user_id, alert_key);
                CREATE INDEX IF NOT EXISTS ix_alert_record_user_type ON alert_records(user_id, alert_type);
                CREATE INDEX IF NOT EXISTS ix_alert_record_budget ON alert_records(budget_id);
                CREATE INDEX IF NOT EXISTS ix_alert_record_goal ON alert_records(goal_id);
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
