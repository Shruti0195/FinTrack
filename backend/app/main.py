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
