# backend/app/core/email.py
import hashlib
import hmac
import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional, Union

import httpx
from pydantic import BaseModel, Field, model_validator

from app.core.config import settings

logger = logging.getLogger(__name__)


class MailbridgeError(Exception):
    """Base exception for Mailbridge email delivery failures."""


class MailbridgeConfigError(MailbridgeError):
    """Raised when required Mailbridge configuration is missing."""


class MailbridgeHTTPError(MailbridgeError):
    """Raised when Mailbridge returns a non-200 HTTP response."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Mailbridge request failed with status {status_code}: {detail}")


class EmailAttachment(BaseModel):
    """Base64-encoded email attachment payload for Mailbridge."""

    filename: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    content_type: str = Field(..., min_length=1)


class EmailMessage(BaseModel):
    """Validated email request payload matching Mailbridge POST /send contract."""

    to_email: Union[str, List[str]]
    subject: str = Field(..., min_length=1, max_length=998)
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    reply_to: Optional[str] = None
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    attachments: Optional[List[EmailAttachment]] = None

    @model_validator(mode="after")
    def validate_body_content(self) -> "EmailMessage":
        has_html = bool(self.html_content and self.html_content.strip())
        has_text = bool(self.text_content and self.text_content.strip())
        if not has_html and not has_text:
            raise ValueError("At least one of html_content or text_content must be provided.")
        return self


class MailbridgeSendResult(BaseModel):
    """Structured 200 OK response from Mailbridge POST /send."""

    status: str
    request_id: Optional[str] = None
    app_id: Optional[str] = None
    recipients: List[str] = Field(default_factory=list)


class MailbridgeClient:
    """Reusable async adapter for the Mailbridge HTTP-to-SMTP relay service."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        app_id: Optional[str] = None,
        signing_secret: Optional[str] = None,
        timeout: Optional[float] = None,
        http_client: Optional[httpx.AsyncClient] = None,
    ):
        self._base_url = base_url
        self._api_key = api_key
        self._app_id = app_id
        self._signing_secret = signing_secret
        self._timeout = timeout
        self._http_client = http_client

    def _resolve_config(self) -> tuple[str, str, Optional[str], Optional[str], float]:
        base_url = (self._base_url if self._base_url is not None else settings.MAILBRIDGE_URL) or ""
        api_key = (self._api_key if self._api_key is not None else settings.MAILBRIDGE_API_KEY) or ""
        app_id = self._app_id if self._app_id is not None else settings.MAILBRIDGE_APP_ID
        signing_secret = (
            self._signing_secret if self._signing_secret is not None else settings.MAILBRIDGE_SIGNING_SECRET
        )
        timeout = self._timeout if self._timeout is not None else settings.MAILBRIDGE_TIMEOUT_SECONDS

        base_url = base_url.strip().rstrip("/")
        api_key = api_key.strip()
        app_id = app_id.strip() if app_id and app_id.strip() else None
        signing_secret = signing_secret.strip() if signing_secret and signing_secret.strip() else None

        if not base_url:
            raise MailbridgeConfigError("MAILBRIDGE_URL is not configured.")
        if not api_key:
            raise MailbridgeConfigError("MAILBRIDGE_API_KEY is not configured.")

        return base_url, api_key, app_id, signing_secret, timeout

    @staticmethod
    def compute_signature(signing_secret: str, timestamp: str, nonce: str, raw_body: bytes) -> str:
        """Compute HMAC-SHA256 hex digest over '{timestamp}.{nonce}.{raw_json_body}'."""
        prefix = f"{timestamp}.{nonce}.".encode("utf-8")
        message = prefix + raw_body
        return hmac.new(signing_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()

    def _build_headers(
        self,
        api_key: str,
        app_id: Optional[str],
        signing_secret: Optional[str],
        raw_body: bytes,
    ) -> Dict[str, str]:
        headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        }
        if app_id:
            headers["X-App-Id"] = app_id

        if signing_secret:
            timestamp = str(int(time.time()))
            nonce = str(uuid.uuid4())
            headers["X-Timestamp"] = timestamp
            headers["X-Nonce"] = nonce
            headers["X-Signature"] = self.compute_signature(signing_secret, timestamp, nonce, raw_body)

        return headers

    async def send(self, message: EmailMessage) -> MailbridgeSendResult:
        """Send an email via Mailbridge POST /send using exact raw JSON bytes."""
        base_url, api_key, app_id, signing_secret, timeout = self._resolve_config()
        endpoint = f"{base_url}/send"

        payload_dict: Dict[str, Any] = message.model_dump(exclude_none=True)
        # Serialize deterministically to raw UTF-8 bytes so HMAC matches exact body bytes sent
        raw_body = json.dumps(payload_dict, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        headers = self._build_headers(api_key, app_id, signing_secret, raw_body)

        try:
            if self._http_client is not None:
                response = await self._http_client.post(endpoint, content=raw_body, headers=headers)
            else:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(endpoint, content=raw_body, headers=headers)
        except httpx.TimeoutException as exc:
            logger.error("Mailbridge request timed out after %ss when sending to %s", timeout, endpoint)
            raise MailbridgeError(f"Mailbridge request timed out after {timeout}s") from exc
        except httpx.RequestError as exc:
            logger.error("Mailbridge network error when sending to %s: %s", endpoint, type(exc).__name__)
            raise MailbridgeError(f"Mailbridge network error: {type(exc).__name__}") from exc

        if response.status_code != 200:
            # Truncate response body for safe logging without leaking sensitive headers
            body_preview = (response.text or "")[:300]
            logger.error(
                "Mailbridge returned HTTP %s from %s: %s",
                response.status_code,
                endpoint,
                body_preview,
            )
            raise MailbridgeHTTPError(response.status_code, body_preview or response.reason_phrase)

        return MailbridgeSendResult.model_validate(response.json())

    async def send_email(
        self,
        to_email: Union[str, List[str]],
        subject: str,
        html_content: Optional[str] = None,
        text_content: Optional[str] = None,
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None,
    ) -> MailbridgeSendResult:
        """Convenience helper accepting keyword arguments directly."""
        message = EmailMessage(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            reply_to=reply_to,
            cc=cc,
            bcc=bcc,
            attachments=attachments,
        )
        return await self.send(message)


mailbridge_client = MailbridgeClient()
