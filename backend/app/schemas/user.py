import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal

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
    created_at: datetime

    class Config:
        from_attributes = True

class UserSettingsUpdate(BaseModel):
    name: Optional[str] = None
    email_alerts_enabled: Optional[bool] = None

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
