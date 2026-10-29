import os
from pathlib import Path
from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinTrack"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "fintrack-super-secret-dev-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    DATABASE_URL: str = "postgresql+psycopg://postgres:root@localhost:5432/fintrack_db"

    # Gmail SMTP Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@fintrack.com"
    EMAILS_FROM_NAME: str = "FinTrack Personal Finance"
    FRONTEND_URL: str = "http://localhost:5173"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    SUPPORT_EMAIL: str = "fintrack37@gmail.com"

    class Config:
        env_file = (
            str(_BACKEND_DIR / ".env"),
            str(_ROOT_DIR / ".env"),
            ".env"
        )
        extra = "ignore"
        case_sensitive = True

settings = Settings()
