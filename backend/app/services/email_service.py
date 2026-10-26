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

        smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, smtp_password)
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

        smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_USER, [email_to], msg.as_string())

        logger.info(f"Password reset email successfully sent to {email_to}")
        print(f"[SUCCESS] Password reset email sent to {email_to} via Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email_to}: {str(e)}")
        print(f"[ERROR] Failed to send password reset email via Gmail: {str(e)}")
        return False

def generate_budget_alert_email_html(
    name: str,
    category_name: str,
    spent_amount: float,
    limit_amount: float,
    pct_used: float,
    days_left: int
) -> str:
    is_over = pct_used >= 100.0
    status_title = f"Budget Alert: {category_name} is {'over limit' if is_over else f'{pct_used:.0f}% used'}"
    badge_color = "#EF4444" if is_over else "#F59E0B"
    badge_bg = "rgba(239, 68, 68, 0.1)" if is_over else "rgba(245, 158, 11, 0.1)"
    
    msg_body = (
        f"You've exceeded your <b>{category_name}</b> budget limit of ₹{limit_amount:,.2f} (Spent: ₹{spent_amount:,.2f}). Adjust your budget or review upcoming expenses to stay on track."
        if is_over else
        f"Your <b>{category_name}</b> budget is <b>{pct_used:.0f}% used</b> (₹{spent_amount:,.2f} of ₹{limit_amount:,.2f}) with {days_left} days left in the month. A little planning can keep you on track."
    )
    
    app_url = f"{settings.FRONTEND_URL}"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{status_title}</title>
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
                    <div style="color: #94A3B8; font-size: 11px; margin-top: 1px;">Smart Budget Advisory</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; padding: 4px 12px; border-radius: 6px; background-color: {badge_bg}; color: {badge_color}; font-size: 12.5px; font-weight: 700; margin-bottom: 14px;">
                {'⚠️ BUDGET ALERT' if is_over else '🔔 BUDGET WARNING'}
              </div>
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                {category_name} Budget Update
              </h1>
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
                Hi <b>{name}</b>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14.5px; color: #475569; line-height: 1.6;">
                {msg_body}
              </p>

              <!-- Stat Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 20px 0;">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <div style="font-size: 12px; color: #64748B; font-weight: 600;">AMOUNT SPENT</div>
                    <div style="font-size: 20px; font-weight: 700; color: {badge_color}; margin-top: 2px;">₹{spent_amount:,.2f}</div>
                  </td>
                  <td style="width: 50%; vertical-align: top;">
                    <div style="font-size: 12px; color: #64748B; font-weight: 600;">BUDGET LIMIT</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0F172A; margin-top: 2px;">₹{limit_amount:,.2f}</div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0 10px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #10B981;">
                    <a href="{app_url}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14.5px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px; background-color: #10B981;">
                      Open Budgets in FinTrack &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                &copy; 2026 FinTrack. Personal Finance Analytics. You can adjust notification settings anytime in your profile.
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

def send_budget_alert_email(
    email_to: str,
    name: str,
    category_name: str,
    spent_amount: float,
    limit_amount: float,
    pct_used: float,
    days_left: int
) -> bool:
    html_content = generate_budget_alert_email_html(
        name=name,
        category_name=category_name,
        spent_amount=spent_amount,
        limit_amount=limit_amount,
        pct_used=pct_used,
        days_left=days_left
    )
    is_over = pct_used >= 100.0
    subject = f"FinTrack Alert: {category_name} budget is {'over limit!' if is_over else f'{pct_used:.0f}% used'}"
    plain_text = (
        f"Hi {name},\n\n"
        f"Budget update for {category_name}:\n"
        f"Spent: ₹{spent_amount:,.2f} / Limit: ₹{limit_amount:,.2f} ({pct_used:.0f}% used).\n\n"
        f"Manage your budgets in FinTrack: {settings.FRONTEND_URL}\n"
    )

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 65)
        print("[DEV MODE: BUDGET ALERT EMAIL DISPATCH]")
        print(f"Recipient: {name} <{email_to}>")
        print(f"Subject: {subject}")
        print(f"Details: {category_name} - ₹{spent_amount} / ₹{limit_amount} ({pct_used:.0f}%)")
        print("NOTE: Set SMTP_USER & SMTP_PASSWORD in backend/.env for real Gmail delivery.")
        print("=" * 65 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = email_to

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_USER, [email_to], msg.as_string())

        logger.info(f"Budget alert email successfully sent to {email_to}")
        print(f"[SUCCESS] Budget alert email sent to {email_to} via Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to send budget alert email to {email_to}: {str(e)}")
        print(f"[ERROR] Failed to send budget alert email via Gmail: {str(e)}")
        return False


def generate_goal_milestone_email_html(
    name: str,
    goal_title: str,
    saved_amount: float,
    target_amount: float,
    milestone_pct: int
) -> str:
    is_completed = milestone_pct >= 100
    status_title = f"Goal Update: {goal_title} is {'100% Achieved!' if is_completed else f'{milestone_pct}% Reached'}"
    badge_color = "#10B981"
    badge_bg = "rgba(16, 185, 129, 0.12)"
    
    msg_body = (
        f"Woohoo! You've fully achieved your <b>{goal_title}</b> savings goal of ₹{target_amount:,.2f}! What an incredible milestone! 🎉"
        if is_completed else
        f"Great progress! You've reached <b>{milestone_pct}%</b> (₹{saved_amount:,.2f} of ₹{target_amount:,.2f}) of your <b>{goal_title}</b> savings goal."
    )
    
    app_url = f"{settings.FRONTEND_URL}"

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{status_title}</title>
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
                    🎯
                  </td>
                  <td style="padding-left: 12px;">
                    <div style="color: #FFFFFF; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">FinTrack</div>
                    <div style="color: #94A3B8; font-size: 11px; margin-top: 1px;">Goal Progress Celebration</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; padding: 4px 12px; border-radius: 6px; background-color: {badge_bg}; color: {badge_color}; font-size: 12.5px; font-weight: 700; margin-bottom: 14px;">
                {'🎉 GOAL ACHIEVED' if is_completed else f'🎯 {milestone_pct}% MILESTONE'}
              </div>
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;">
                {goal_title} Progress Update
              </h1>
              <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
                Hi <b>{name}</b>,
              </p>
              <p style="margin: 0 0 20px; font-size: 14.5px; color: #475569; line-height: 1.6;">
                {msg_body}
              </p>

              <!-- Stat Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 20px 0;">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <div style="font-size: 12px; color: #64748B; font-weight: 600;">AMOUNT SAVED</div>
                    <div style="font-size: 20px; font-weight: 700; color: {badge_color}; margin-top: 2px;">₹{saved_amount:,.2f}</div>
                  </td>
                  <td style="width: 50%; vertical-align: top;">
                    <div style="font-size: 12px; color: #64748B; font-weight: 600;">GOAL TARGET</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0F172A; margin-top: 2px;">₹{target_amount:,.2f}</div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0 10px;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #10B981;">
                    <a href="{app_url}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14.5px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px; background-color: #10B981;">
                      View Goal in FinTrack &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                &copy; 2026 FinTrack. Personal Finance Analytics. You can adjust notification settings anytime in your profile.
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

def send_goal_milestone_email(
    email_to: str,
    name: str,
    goal_title: str,
    saved_amount: float,
    target_amount: float,
    milestone_pct: int
) -> bool:
    html_content = generate_goal_milestone_email_html(
        name=name,
        goal_title=goal_title,
        saved_amount=saved_amount,
        target_amount=target_amount,
        milestone_pct=milestone_pct
    )
    is_completed = milestone_pct >= 100
    subject = f"FinTrack Goal Update: {goal_title} is {'100% Achieved!' if is_completed else f'{milestone_pct}% Reached'}"
    plain_text = (
        f"Hi {name},\n\n"
        f"Goal milestone update for {goal_title}:\n"
        f"Saved: ₹{saved_amount:,.2f} / Target: ₹{target_amount:,.2f} ({milestone_pct}% reached).\n\n"
        f"Manage your goals in FinTrack: {settings.FRONTEND_URL}\n"
    )

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 65)
        print("[DEV MODE: GOAL MILESTONE EMAIL DISPATCH]")
        print(f"Recipient: {name} <{email_to}>")
        print(f"Subject: {subject}")
        print("=" * 65 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = email_to

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_USER, [email_to], msg.as_string())

        logger.info(f"Goal milestone email successfully sent to {email_to}")
        print(f"[SUCCESS] Goal milestone email sent to {email_to} via Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to send goal milestone email to {email_to}: {str(e)}")
        print(f"[ERROR] Failed to send goal milestone email via Gmail: {str(e)}")
        return False


def generate_support_report_email_html(
    user_name: str,
    user_email: str,
    report_type: str,
    title: str,
    description: str,
    page: str = None
) -> str:
    page_text = page if page else "Not specified"
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New FinTrack User Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #0F172A; padding: 20px 28px;">
              <span style="color: #10B981; font-weight: 700; font-size: 16px;">FinTrack Support</span>
              <span style="color: #94A3B8; font-size: 14px; margin-left: 8px;">• New User Report</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: #ECFDF5; color: #047857; font-weight: 600; font-size: 12px; margin-bottom: 16px;">
                {report_type}
              </div>
              <h2 style="margin: 0 0 12px; font-size: 20px; color: #0F172A;">{title}</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748B; width: 90px;">From:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #1E293B;">{user_name} ({user_email})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Page:</td>
                  <td style="padding: 6px 0; color: #1E293B;">{page_text}</td>
                </tr>
              </table>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #334155;">
{description}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_support_report_email(
    user_name: str,
    user_email: str,
    report_type: str,
    title: str,
    description: str,
    page: str = None
) -> bool:
    target_email = settings.SUPPORT_EMAIL or settings.EMAILS_FROM_EMAIL or "fintrack37@gmail.com"
    subject = f"[FinTrack Support] {report_type}: {title}"
    plain_text = (
        f"New Support Report from {user_name} ({user_email}):\n\n"
        f"Type: {report_type}\n"
        f"Page: {page or 'Not specified'}\n"
        f"Title: {title}\n\n"
        f"Description:\n{description}\n"
    )
    html_content = generate_support_report_email_html(
        user_name=user_name,
        user_email=user_email,
        report_type=report_type,
        title=title,
        description=description,
        page=page
    )

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 65)
        print("[DEV MODE: SUPPORT REPORT EMAIL DISPATCH]")
        print(f"To: {target_email}")
        print(f"Subject: {subject}")
        print(f"From: {user_name} <{user_email}>")
        print(f"Details:\n{plain_text}")
        print("=" * 65 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = target_email
        msg["Reply-To"] = user_email

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_USER, [target_email], msg.as_string())

        logger.info(f"Support report email sent to {target_email}")
        print(f"[SUCCESS] Support report email sent to {target_email} via Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to send support report email: {str(e)}")
        print(f"[ERROR] Failed to send support report email: {str(e)}")
        return False


def generate_password_changed_email_html(name: str, changed_at_str: str, reset_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your FinTrack Password Was Changed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #0F172A; padding: 22px 28px;">
              <span style="color: #10B981; font-weight: 700; font-size: 17px;">FinTrack</span>
              <span style="color: #94A3B8; font-size: 13px; margin-left: 8px;">• Security Alert</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; color: #0F172A;">Your password was changed</h2>
              <p style="margin: 0 0 14px; font-size: 14.5px; color: #334155;">
                Hi <b>{name}</b>,
              </p>
              <p style="margin: 0 0 16px; font-size: 14.5px; color: #475569; line-height: 1.6;">
                The password for your FinTrack account was successfully changed on <strong>{changed_at_str}</strong>.
              </p>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13.5px; color: #334155;">
                🔒 <strong>Device Security Notice:</strong> All other active sessions and browsers have been logged out automatically.
              </div>
              <p style="margin: 0 0 20px; font-size: 14px; color: #DC2626; font-weight: 600;">
                If this wasn't you, reset your password right away to secure your account.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="{reset_url}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px; background-color: #EF4444;">
                  Reset Your Password Immediately &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 28px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                &copy; 2026 FinTrack. If you need assistance, contact our support team.
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


def send_password_changed_email(
    user_name: str,
    user_email: str,
    changed_at_str: str,
    reset_url: str
) -> bool:
    subject = "FinTrack Security Alert: Your password was changed"
    plain_text = (
        f"Hi {user_name},\n\n"
        f"The password for your FinTrack account was successfully changed on {changed_at_str}.\n"
        f"All other devices and browsers where you were logged in have been signed out.\n\n"
        f"If this wasn't you, reset your password right away:\n{reset_url}\n"
    )
    html_content = generate_password_changed_email_html(
        name=user_name,
        changed_at_str=changed_at_str,
        reset_url=reset_url
    )

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 65)
        print("[DEV MODE: PASSWORD CHANGED SECURITY ALERT EMAIL]")
        print(f"To: {user_email}")
        print(f"Subject: {subject}")
        print(f"Details:\n{plain_text}")
        print("=" * 65 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = user_email

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, smtp_password)
            server.sendmail(settings.SMTP_USER, [user_email], msg.as_string())

        logger.info(f"Password changed security email sent to {user_email}")
        print(f"[SUCCESS] Password changed security email sent to {user_email} via Gmail SMTP.")
        return True
    except Exception as e:
        logger.error(f"Failed to send password changed email to {user_email}: {str(e)}")
        print(f"[ERROR] Failed to send password changed email: {str(e)}")
        return False


