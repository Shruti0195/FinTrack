import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal, List

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    email_alerts_enabled: bool = True  # Permission checkbox during registration

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: uuid.UUID
    role: Literal['USER', 'ADMIN']
    is_active: bool
    is_verified: bool
    email_alerts_enabled: bool
    email_budget_alerts: bool = True
    goal_milestone_notifs: bool = True
    monthly_report_notifs: bool = True
    budget_alert_thresholds: Optional[List[int]] = [80, 100]
    budget_alert_in_app: bool = True
    budget_alert_email: bool = True
    goal_milestone_thresholds: Optional[List[int]] = [25, 50, 75, 100]
    goal_deadline_reminder_days: Optional[int] = 7
    goal_inactivity_nudge_days: Optional[int] = 30
    goal_alert_in_app: bool = True
    goal_alert_email: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

class UserSettingsUpdate(BaseModel):
    name: Optional[str] = None
    email_alerts_enabled: Optional[bool] = None
    email_budget_alerts: Optional[bool] = None
    goal_milestone_notifs: Optional[bool] = None
    monthly_report_notifs: Optional[bool] = None
    budget_alert_thresholds: Optional[List[int]] = None
    budget_alert_in_app: Optional[bool] = None
    budget_alert_email: Optional[bool] = None
    goal_milestone_thresholds: Optional[List[int]] = None
    goal_deadline_reminder_days: Optional[int] = None
    goal_inactivity_nudge_days: Optional[int] = None
    goal_alert_in_app: Optional[bool] = None
    goal_alert_email: Optional[bool] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class ChangePasswordResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    success: bool = True
