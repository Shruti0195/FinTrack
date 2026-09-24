import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_email_verification_token,
    verify_email_verification_token,
)
from app.models.user import User, PasswordReset
from app.schemas.user import (
    UserCreate,
    UserOut,
    MessageResponse,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.token import Token
from app.api.deps import get_current_user
from app.services.email_service import send_verification_email, send_password_reset_email

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Public registration endpoint for the User Panel.
    Collects name, email, password, and email_alerts_enabled consent checkbox.
    Role is strictly set to 'USER'.
    User is created with is_active=False and is_verified=False until email is confirmed.
    """
    clean_email = user_in.email.lower().strip()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists in FinTrack.",
        )
    
    user = User(
        name=user_in.name.strip(),
        email=clean_email,
        password_hash=get_password_hash(user_in.password),
        role='USER',
        is_active=False,      # Inactive until Gmail verification
        is_verified=False,    # Unverified
        email_alerts_enabled=user_in.email_alerts_enabled,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate verification token & dispatch Gmail in background
    token = create_email_verification_token(user.id)
    background_tasks.add_task(send_verification_email, user.email, user.name, token)

    return user

@router.get("/verify-email", response_model=MessageResponse)
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    """
    Validates email verification token sent to user's inbox.
    Upon success, activates user account (is_active=True, is_verified=True).
    """
    user_id = verify_email_verification_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification link is invalid or has expired. Please request a new one.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    if user.is_verified and user.is_active:
        return MessageResponse(message="Your email is already verified. You can log in right away.")

    # Activate account & mark verified
    user.is_verified = True
    user.is_active = True
    user.email_verified_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    return MessageResponse(
        message="Email verified successfully! Your FinTrack account is now active. You may now log in.",
        success=True
    )

@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    req: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Resends a fresh email verification link if user lost or didn't receive the first one.
    """
    clean_email = req.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        return MessageResponse(
            message="If an account with this email exists, a fresh verification link has been sent."
        )

    if user.is_verified and user.is_active:
        return MessageResponse(message="This account is already verified and active. You can log in.")

    token = create_email_verification_token(user.id)
    background_tasks.add_task(send_verification_email, user.email, user.name, token)

    return MessageResponse(message="A new verification link has been sent to your email inbox.")

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Initiates password reset flow. Sends a secure, single-use link to user's email.
    Always returns generic success message to prevent user enumeration.
    """
    clean_email = req.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()
    if user:
        # Invalidate previous unused reset tokens for this user
        db.query(PasswordReset).filter(
            PasswordReset.user_id == user.id,
            PasswordReset.used == False
        ).update({"used": True})

        # Generate single-use secure reset token (valid 1 hour)
        reset_token = secrets.token_urlsafe(32)
        reset_record = PasswordReset(
            user_id=user.id,
            token=reset_token,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            used=False
        )
        db.add(reset_record)
        db.commit()

        # Send reset email in background
        background_tasks.add_task(send_password_reset_email, user.email, user.name, reset_token)

    return MessageResponse(
        message="If this email is registered, a password reset link has been sent to your inbox."
    )

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates password reset token and sets new password in PostgreSQL.
    """
    now = datetime.now(timezone.utc)
    reset_record = db.query(PasswordReset).filter(
        PasswordReset.token == req.token,
        PasswordReset.used == False,
        PasswordReset.expires_at > now
    ).first()

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset link is invalid or has expired. Please request a new one."
        )

    user = db.query(User).filter(User.id == reset_record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    # Update password and mark token used
    user.password_hash = get_password_hash(req.new_password)
    reset_record.used = True
    db.add(user)
    db.add(reset_record)
    db.commit()

    return MessageResponse(
        message="Your password has been reset successfully! You can now log in with your new password.",
        success=True
    )

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    OAuth2 standard login endpoint used by both User and Admin.
    Checks password, verification status, and active status.
    """
    email_clean = form_data.username.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check email verification / active status
    if not user.is_verified or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not active. Please verify your email via the link sent to your inbox before logging in.",
        )

    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns authenticated user's profile and role (USER or ADMIN).
    """
    return current_user
