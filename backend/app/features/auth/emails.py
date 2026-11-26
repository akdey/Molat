# backend/app/features/auth/emails.py
import logging
from app.core.config import settings
from app.core.email import MailbridgeConfigError, MailbridgeError, mailbridge_client

logger = logging.getLogger("molat.auth.email")


async def send_verification_email(
    to_email: str,
    username: str,
    otp_code: str,
    link_token: str,
) -> bool:
    """
    Send an editorial verification email containing both a 6-digit OTP code
    and a clickable verification link. Returns True if sent, False if Mailbridge
    is unconfigured or fails (so signup remains resilient).
    """
    frontend_base = (settings.FRONTEND_URL or "https://molat-akdey.vercel.app").strip().rstrip("/")
    verify_url = f"{frontend_base}/?verify_token={link_token}"

    subject = f"Verify your Molat Ex Libris email — Code: {otp_code}"

    html_content = f"""
    <div style="font-family: Georgia, 'Times New Roman', serif; background-color: #FBF9F5; color: #1C1917; padding: 32px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2D9C8; border-radius: 16px; padding: 32px;">
        <p style="font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #C2410C; margin: 0 0 8px;">
          ❧ EX LIBRIS • MOLAT PERSONAL LIBRARY
        </p>
        <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px; color: #1C1917;">
          Verify your reader email, ex/{username}
        </h1>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; color: #44403C; margin: 0 0 20px;">
          Confirm your email address to unlock Family Alcove invitations and protect your reading sanctuary.
          Enter this 6-digit code in the app, or click the button below:
        </p>

        <div style="background-color: #FBF9F5; border: 1px dashed #C2410C; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 24px;">
          <span style="font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.25em; color: #C2410C;">
            {otp_code}
          </span>
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #78716C; margin: 8px 0 0;">
            Expires in 15 minutes
          </p>
        </div>

        <div style="text-align: center; margin: 0 0 24px;">
          <a href="{verify_url}" style="display: inline-block; background-color: #C2410C; color: #FFFFFF; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px;">
            Verify Email Address
          </a>
        </div>

        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #78716C; line-height: 1.5; margin: 0;">
          If the button doesn't work, paste this link into your browser:<br />
          <a href="{verify_url}" style="color: #C2410C; word-break: break-all;">{verify_url}</a>
        </p>

        <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2D9C8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #78716C; text-align: center;">
          Molat Personal Library &bull; Engineered by
          <a href="https://portfolio.akdey.vercel.app/" style="color: #1C1917; font-weight: 600; text-decoration: underline;">AMIT KUMAR DEY</a>
        </p>
      </div>
    </div>
    """

    text_content = (
        f"Verify your Molat Ex Libris email (ex/{username})\n\n"
        f"Your 6-digit verification code: {otp_code}\n"
        f"Or verify via link: {verify_url}\n\n"
        "This code expires in 15 minutes.\n\n"
        "---\n"
        "Molat Personal Library • Engineered by AMIT KUMAR DEY (https://portfolio.akdey.vercel.app/)"
    )

    try:
        await mailbridge_client.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )
        return True
    except MailbridgeConfigError:
        logger.warning("Mailbridge not configured; skipping verification email for user ex/%s", username)
        return False
    except MailbridgeError as exc:
        logger.error("Failed to send verification email for user ex/%s: %s", username, exc)
        return False
