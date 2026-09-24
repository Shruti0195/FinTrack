import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def generate_verification_email_html(name: str, verification_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your FinTrack email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 32px; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #10B981; width: 32px; height: 32px; border-radius: 8px; text-align: center; vertical-align: middle; color: #FFFFFF; font-size: 18px; font-weight: bold;">
                    💰
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="color: #FFFFFF; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">FinTrack</div>
                    <div style="color: #94A3B8; font-size: 11px; margin-top: 1px;">Personal Finance Analytics</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                Verify your email address
              </h1>
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
                Hi <b>{name}</b>,
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; color: #475569;">
                Welcome to <b>FinTrack</b>! To activate your account and start tracking your income, category budgets, and financial health score, please verify your email address.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #10B981;">
                    <a href="{verification_url}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px; background-color: #10B981;">
                      Activate Account & Verify Email &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct URL -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-top: 24px;">
                <p style="margin: 0 0 6px; font-size: 12px; color: #64748B;">
                  Button not working? Copy and paste this URL into your browser:
                </p>
                <a href="{verification_url}" target="_blank" style="font-size: 12px; color: #10B981; word-break: break-all; text-decoration: underline;">
                  {verification_url}
                </a>
              </div>

              <!-- Expiration note -->
              <p style="margin: 24px 0 0; font-size: 13px; color: #94A3B8;">
                ⚠️ This verification link will expire in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours. If you did not create a FinTrack account, you can safely disregard this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                &copy; 2026 FinTrack. Personal Finance Analytics. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def generate_password_reset_email_html(name: str, reset_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your FinTrack password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 32px; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #10B981; width: 32px; height: 32px; border-radius: 8px; text-align: center; vertical-align: middle; color: #FFFFFF; font-size: 18px; font-weight: bold;">
                    💰
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="color: #FFFFFF; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">FinTrack</div>
                    <div style="color: #94A3B8; font-size: 11px; margin-top: 1px;">Password Reset Request</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                Reset your password
              </h1>
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
                Hi <b>{name}</b>,
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; color: #475569;">
                We received a request to reset your FinTrack account password. Click the secure link below to set a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #10B981;">
                    <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px; background-color: #10B981;">
                      Set New Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct URL -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-top: 24px;">
                <p style="margin: 0 0 6px; font-size: 12px; color: #64748B;">
                  Button not working? Copy and paste this URL into your browser:
                </p>
                <a href="{reset_url}" target="_blank" style="font-size: 12px; color: #10B981; word-break: break-all; text-decoration: underline;">
                  {reset_url}
                </a>
              </div>

              <!-- Security Warning -->
              <p style="margin: 24px 0 0; font-size: 13px; color: #94A3B8;">
                ⚠️ This password reset link is single-use and will expire in 1 hour. If you did not request a password reset, please ignore this email. Your current password remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                &copy; 2026 FinTrack. Personal Finance Analytics. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def send_verification_email(email_to: str, name: str, token: str) -> bool:
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html_content = generate_verification_email_html(name=name, verification_url=verification_url)
    plain_text = (
        f"Hi {name},\n\n"
        f"Welcome to FinTrack! Please activate your account by verifying your email:\n"
        f"{verification_url}\n\n"
        f"This link expires in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.\n"
        f"If you did not sign up for FinTrack, please ignore this email."
    )

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 65)
        print("[DEV MODE: EMAIL VERIFICATION DISPATCH]")
        print(f"Recipient: {name} <{email_to}>")
        print(f"Activation Link: {verification_url}")
        print("NOTE: Set SMTP_USER & SMTP_PASSWORD in backend/.env for real Gmail delivery.")
        print("=" * 65 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify your FinTrack Account"
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = email_to

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [email_to], msg.as_string())

        logger.info(f"Verification email successfully sent to {email_to}")
        print(f"[SUCCESS] Verification email sent to {email_to} via Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email_to}: {str(e)}")
        print(f"[ERROR] Failed to send email via Gmail: {str(e)}")
        return False

def send_password_reset_email(email_to: str, name: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html_content = generate_password_reset_email_html(name=name, reset_url=reset_url)
    plain_text = (
        f"Hi {name},\n\n"
        f"We received a request to reset your FinTrack password.\n"
        f"Set a new password here:\n{reset_url}\n\n"
        f"This link expires in 1 hour.\n"
        f"If you did not request this, please ignore this email."
    )

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 65)
        print("[DEV MODE: PASSWORD RESET DISPATCH]")
        print(f"Recipient: {name} <{email_to}>")
        print(f"Password Reset Link: {reset_url}")
        print("NOTE: Set SMTP_USER & SMTP_PASSWORD in backend/.env for real Gmail delivery.")
        print("=" * 65 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your FinTrack Password"
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = email_to

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [email_to], msg.as_string())

        logger.info(f"Password reset email successfully sent to {email_to}")
        print(f"[SUCCESS] Password reset email sent to {email_to} via Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email_to}: {str(e)}")
        print(f"[ERROR] Failed to send password reset email via Gmail: {str(e)}")
        return False
