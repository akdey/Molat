# backend/app/features/alcoves/emails.py
import logging
from app.core.config import settings
from app.core.email import MailbridgeConfigError, MailbridgeError, mailbridge_client

logger = logging.getLogger("molat.alcoves.email")


async def send_alcove_invite_email(
    to_email: str,
    inviter_username: str,
    alcove_name: str,
    invite_code: str,
) -> bool:
    """
    Send an editorial Alcove family library invitation email via Mailbridge.
    Includes both the 1-click join link and the manual invite code.
    """
    frontend_base = (settings.FRONTEND_URL or "https://molat-akdey.vercel.app").strip().rstrip("/")
    join_url = f"{frontend_base}/?join_alcove={invite_code}"

    subject = f"ex/{inviter_username} invited you to join “{alcove_name}” on Molat"

    html_content = f"""
    <div style="font-family: Georgia, 'Times New Roman', serif; background-color: #FBF9F5; color: #1C1917; padding: 32px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2D9C8; border-radius: 16px; padding: 32px;">
        <p style="font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #C2410C; margin: 0 0 8px;">
          ❧ SHARED HOUSEHOLD ALCOVE • MOLAT
        </p>
        <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 14px; color: #1C1917;">
          You're invited to “{alcove_name}”
        </h1>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; color: #44403C; margin: 0 0 20px;">
          <strong>ex/{inviter_username}</strong> has invited you to share a household bookshelf on Molat.
          Browse shared physical books, avoid duplicate purchases, and keep your own personal reading streak and notes.
        </p>

        <div style="background-color: #FBF9F5; border: 1px dashed #C2410C; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 24px;">
          <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #78716C; margin: 0 0 6px;">
            Alcove Invite Code
          </p>
          <span style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; letter-spacing: 0.14em; color: #C2410C;">
            {invite_code}
          </span>
        </div>

        <div style="text-align: center; margin: 0 0 24px;">
          <a href="{join_url}" style="display: inline-block; background-color: #C2410C; color: #FFFFFF; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 10px;">
            Join {alcove_name}
          </a>
        </div>

        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #78716C; line-height: 1.5; margin: 0;">
          Or paste this link in your browser:<br />
          <a href="{join_url}" style="color: #C2410C; word-break: break-all;">{join_url}</a>
        </p>

        <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2D9C8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; color: #78716C; text-align: center;">
          Molat Personal Library &bull; Engineered by
          <a href="https://portfolio.akdey.vercel.app/" style="color: #1C1917; font-weight: 600; text-decoration: underline;">AMIT KUMAR DEY</a>
        </p>
      </div>
    </div>
    """

    text_content = (
        f"ex/{inviter_username} invited you to join '{alcove_name}' on Molat.\n\n"
        f"Alcove Invite Code: {invite_code}\n"
        f"Join directly: {join_url}\n\n"
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
        logger.warning("Mailbridge not configured; Alcove invite %s created without email send", invite_code)
        return False
    except MailbridgeError as exc:
        logger.error("Failed to send Alcove invite email to %s: %s", to_email, exc)
        return False
