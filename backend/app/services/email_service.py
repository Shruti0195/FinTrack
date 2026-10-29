import smtplib
import ssl
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def _send_smtp_email(
    to_email: str,
    subject: str,
    plain_text: str,
    html_content: str,
    reply_to: str = None,
    description: str = "email"
) -> bool:
    """
    Robust SMTP email sender with:
    - Primary connection (SSL 465 or STARTTLS 587 based on configuration)
    - Automatic fallback (if 465 fails, tries 587; if 587 fails, tries 465)
    - Modern SSLContext
    - 25-second socket timeout to prevent 'Connection unexpectedly closed' on slow networks
    - Dev-mode console fallback if credentials are unset
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 65)
        print(f"[DEV MODE: {description.upper()} DISPATCH]")
        print(f"Recipient: {to_email}")
        print(f"Subject: {subject}")
        print("Details:\n" + plain_text)
        print("NOTE: Set SMTP_USER & SMTP_PASSWORD in backend/.env for real delivery.")
        print("=" * 65 + "\n")
        return True

    from_name = (settings.EMAILS_FROM_NAME or "FinTrack").strip('"\'')
    from_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
    smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to

    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))
    msg_str = msg.as_string()

    # Determine connection sequence: try configured port first, then alternate fallback port
    configured_port = int(settings.SMTP_PORT or 465)
    if configured_port == 465:
        ports_to_try = [465, 587]
    elif configured_port == 587:
        ports_to_try = [587, 465]
    else:
        ports_to_try = [configured_port, 465, 587]

    ssl_context = ssl.create_default_context()
    last_error = None

    for port in ports_to_try:
        try:
            if port == 465:
                # Direct SSL/TLS socket (recommended for Gmail - fast and reliable)
                with smtplib.SMTP_SSL(settings.SMTP_HOST, 465, context=ssl_context, timeout=25) as server:
                    server.login(settings.SMTP_USER, smtp_password)
                    server.sendmail(settings.SMTP_USER, [to_email], msg_str)
            else:
                # STARTTLS socket
                with smtplib.SMTP(settings.SMTP_HOST, port, timeout=25) as server:
                    server.ehlo()
                    server.starttls(context=ssl_context)
                    server.ehlo()
                    server.login(settings.SMTP_USER, smtp_password)
                    server.sendmail(settings.SMTP_USER, [to_email], msg_str)

            logger.info(f"{description.capitalize()} successfully sent to {to_email} via port {port}")
            print(f"[SUCCESS] {description.capitalize()} sent to {to_email} via Gmail SMTP (port {port}).")
            return True

        except Exception as e:
            last_error = e
            logger.warning(f"SMTP attempt on port {port} failed for {to_email}: {str(e)}")
            time.sleep(0.5)

    logger.error(f"Failed to send {description} to {to_email} after trying ports {ports_to_try}: {str(last_error)}")
    print(f"[ERROR] Failed to send email via Gmail: {str(last_error)}")
    return False

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
    return _send_smtp_email(
        to_email=email_to,
        subject="Verify your FinTrack Account",
        plain_text=plain_text,
        html_content=html_content,
        description="verification email"
    )

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
    return _send_smtp_email(
        to_email=email_to,
        subject="Reset your FinTrack Password",
        plain_text=plain_text,
        html_content=html_content,
        description="password reset email"
    )

def generate_budget_alert_email_html(
    name: str,
    category_name: str,
    spent_amount: float,
    limit_amount: float,
    pct_used: float,
    days_left: int
) -> str:
    round_pct = int(round(pct_used))
    is_over = round_pct >= 100
    if round_pct > 100:
        status_title = f"{category_name} Budget Exceeded ({round_pct}%)"
    elif round_pct == 100:
        status_title = f"{category_name} Budget 100% Reached"
    else:
        status_title = f"{category_name} Budget {round_pct}% Reached"
    badge_color = "#EF4444" if is_over else "#F59E0B"
    badge_bg = "rgba(239, 68, 68, 0.1)" if is_over else "rgba(245, 158, 11, 0.1)"
    
    msg_body = (
        f"You've exceeded your <b>{category_name}</b> budget limit of ₹{limit_amount:,.2f} (Spent: ₹{spent_amount:,.2f}, <b>{round_pct}%</b>). Adjust your budget or review upcoming expenses to stay on track."
        if is_over else
        f"Your <b>{category_name}</b> budget is <b>{round_pct}% used</b> (₹{spent_amount:,.2f} of ₹{limit_amount:,.2f}) with {days_left} days left in the month. A little planning can keep you on track."
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
    round_pct = int(round(pct_used))
    is_over = round_pct >= 100
    if round_pct > 100:
        subject = f"FinTrack Alert: {category_name} Budget Exceeded ({round_pct}%)"
    elif round_pct == 100:
        subject = f"FinTrack Alert: {category_name} Budget 100% Reached"
    else:
        subject = f"FinTrack Alert: {category_name} Budget {round_pct}% Reached"
    plain_text = (
        f"Hi {name},\n\n"
        f"Budget update for {category_name}:\n"
        f"Spent: ₹{spent_amount:,.2f} / Limit: ₹{limit_amount:,.2f} ({round_pct}% used).\n\n"
        f"Manage your budgets in FinTrack: {settings.FRONTEND_URL}\n"
    )

    return _send_smtp_email(
        to_email=email_to,
        subject=subject,
        plain_text=plain_text,
        html_content=html_content,
        description="budget alert email"
    )


def generate_goal_milestone_email_html(
    name: str,
    goal_title: str,
    saved_amount: float,
    target_amount: float,
    milestone_pct: int
) -> str:
    is_completed = milestone_pct >= 100
    if milestone_pct > 100:
        status_title = f"Goal Update: {goal_title} is {milestone_pct}% Achieved!"
    elif milestone_pct == 100:
        status_title = f"Goal Update: {goal_title} is 100% Achieved!"
    else:
        status_title = f"Goal Update: {goal_title} is {milestone_pct}% Reached"
    badge_color = "#10B981"
    badge_bg = "rgba(16, 185, 129, 0.12)"
    
    msg_body = (
        f"Woohoo! You've achieved <b>{milestone_pct}%</b> of your <b>{goal_title}</b> savings goal (Target: ₹{target_amount:,.2f})! What an incredible milestone! 🎉"
        if milestone_pct > 100 else
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
    if milestone_pct > 100:
        subject = f"FinTrack Goal Update: {goal_title} is {milestone_pct}% Achieved!"
    elif milestone_pct == 100:
        subject = f"FinTrack Goal Update: {goal_title} is 100% Achieved!"
    else:
        subject = f"FinTrack Goal Update: {goal_title} is {milestone_pct}% Reached"
    plain_text = (
        f"Hi {name},\n\n"
        f"Goal milestone update for {goal_title}:\n"
        f"Saved: ₹{saved_amount:,.2f} / Target: ₹{target_amount:,.2f} ({milestone_pct}% reached).\n\n"
        f"Manage your goals in FinTrack: {settings.FRONTEND_URL}\n"
    )

    return _send_smtp_email(
        to_email=email_to,
        subject=subject,
        plain_text=plain_text,
        html_content=html_content,
        description="goal milestone email"
    )


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

    return _send_smtp_email(
        to_email=target_email,
        subject=subject,
        plain_text=plain_text,
        html_content=html_content,
        reply_to=user_email,
        description="support report email"
    )


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

    return _send_smtp_email(
        to_email=user_email,
        subject=subject,
        plain_text=plain_text,
        html_content=html_content,
        description="password changed security email"
    )




def generate_support_report_update_email_html(
    name: str,
    report_title: str,
    status: str,
    reply: str = "",
    help_url: str = f"{settings.FRONTEND_URL}/#help"
) -> str:
    status_lower = status.lower()
    status_color = "#3B82F6" if status_lower == "open" else "#8B5CF6" if "progress" in status_lower else "#10B981" if status_lower == "resolved" else "#64748B"

    reply_section = ""
    if reply and reply.strip():
        reply_section = f"""
        <div style="background-color: #F8FAFC; border-left: 4px solid #10B981; padding: 14px 18px; margin: 18px 0; border-radius: 0 8px 8px 0;">
          <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; color: #10B981; margin-bottom: 6px; letter-spacing: 0.05em;">
            Response from Support Team
          </div>
          <div style="font-size: 14px; color: #334155; line-height: 1.5; white-space: pre-wrap;">
            {reply}
          </div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Update on your report: {report_title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #0F172A; padding: 22px 28px;">
              <span style="color: #10B981; font-weight: 700; font-size: 17px;">FinTrack</span>
              <span style="color: #94A3B8; font-size: 13px; margin-left: 8px;">• Support &amp; Feedback</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; color: #0F172A;">Your report has been updated</h2>
              <p style="margin: 0 0 14px; font-size: 14.5px; color: #334155;">Hi <b>{name}</b>,</p>
              <p style="margin: 0 0 16px; font-size: 14.5px; color: #475569; line-height: 1.6;">
                The FinTrack team has updated the status of your report <strong>"{report_title}"</strong>:
              </p>
              <div style="margin: 16px 0;">
                <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; background-color: {status_color}1A; color: {status_color}; border: 1px solid {status_color}4D;">
                  Status: {status}
                </span>
              </div>
              {reply_section}
              <p style="margin: 20px 0 24px; font-size: 14px; color: #475569;">
                You can review the full status timeline and responses anytime on your Help page in FinTrack.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="{help_url}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 8px; background-color: #10B981;">
                  View Report in FinTrack &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 28px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">&copy; 2026 FinTrack. Personal Finance Analytics.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def send_support_report_update_email(
    email_to: str,
    user_name: str,
    report_title: str,
    status: str,
    reply: str = "",
    help_url: str = f"{settings.FRONTEND_URL}/#help"
) -> bool:
    subject = f"Update on your report: {report_title}"
    plain_text = (
        f"Hi {user_name},\n\n"
        f"Your report \"{report_title}\" was updated to status: {status}.\n"
    )
    if reply and reply.strip():
        plain_text += f"\nMessage from FinTrack Team:\n{reply}\n"
    plain_text += f"\nView your report anytime on your Help page: {help_url}\n"

    html_content = generate_support_report_update_email_html(
        name=user_name,
        report_title=report_title,
        status=status,
        reply=reply,
        help_url=help_url
    )

    return _send_smtp_email(
        to_email=email_to,
        subject=subject,
        plain_text=plain_text,
        html_content=html_content,
        description="support report update email"
    )
