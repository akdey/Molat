---
name: mailbridge-integration
description: >
  Integrate the Mailbridge HTTP-to-SMTP email relay service into any application.
  Covers environment configuration, HMAC-SHA256 request signing, reusable async
  client, transactional email templates, and unit testing patterns.
---

# Mailbridge Integration Skill

## Purpose

Add transactional email sending to any application using the **Mailbridge**
HTTP-to-SMTP relay service (or its "Mailbrix" variant — same API contract,
different branding). This skill covers:

- Environment variable configuration
- HMAC-SHA256 request signing
- Reusable async email client
- Editorial email templates
- Unit testing with mocked HTTP transport

---

## Environment Variables

Add these to your `.env.example` and deployment environment:

```bash
# Mailbridge / Mailbrix Email Relay Service (HTTP-to-SMTP)
MAILBRIDGE_URL=https://mailbridge-akdey.vercel.app
MAILBRIDGE_APP_ID=<your-app-id>         # e.g. "molat"
MAILBRIDGE_API_KEY=<your-api-key>
MAILBRIDGE_SIGNING_SECRET=              # Optional HMAC-SHA256 signing secret
```

> [!IMPORTANT]
> Never hardcode API keys or signing secrets. Always read from environment
> variables or a secrets manager.

---

## API Contract

**POST** `{MAILBRIDGE_URL}/send`

### Headers

| Header           | Required | Description                                        |
|------------------|----------|----------------------------------------------------|
| `Content-Type`   | Yes      | `application/json`                                 |
| `X-API-Key`      | Yes      | Your Mailbridge API key                            |
| `X-App-Id`       | No       | App identifier for multi-tenant routing            |
| `X-Timestamp`    | If signing | Unix epoch seconds (string)                      |
| `X-Nonce`        | If signing | Unique UUID per request                           |
| `X-Signature`    | If signing | `hex(HMAC-SHA256(secret, "{ts}.{nonce}.{body}"))` |

### JSON Body

| Field          | Type                | Required | Notes                                      |
|----------------|---------------------|----------|--------------------------------------------|
| `to_email`     | `string \| string[]`| Yes      | One or many recipients                     |
| `subject`      | `string`            | Yes      | 1–998 characters                           |
| `html_content` | `string`            | *        | HTML body (* at least one of html/text)    |
| `text_content` | `string`            | *        | Plain-text body                            |
| `reply_to`     | `string`            | No       | Reply-to address                           |
| `cc`           | `string[]`          | No       | Carbon-copy recipients                     |
| `bcc`          | `string[]`          | No       | Blind carbon-copy recipients               |
| `attachments`  | `Attachment[]`      | No       | `{filename, content (base64), content_type}` |

### Success Response (200 OK)

```json
{
  "status": "sent",
  "request_id": "req_abc123",
  "app_id": "molat",
  "recipients": ["reader@example.com"]
}
```

---

## HMAC-SHA256 Signing

When `MAILBRIDGE_SIGNING_SECRET` is set, sign every `POST /send` request:

```python
import hmac, hashlib, time, uuid, json

timestamp = str(int(time.time()))
nonce = str(uuid.uuid4())
raw_body = json.dumps(payload, separators=(",", ":")).encode("utf-8")

# Message = "{timestamp}.{nonce}.{raw_json_body_bytes}"
message = f"{timestamp}.{nonce}.".encode("utf-8") + raw_body
signature = hmac.new(
    signing_secret.encode("utf-8"), message, hashlib.sha256
).hexdigest()

headers["X-Timestamp"] = timestamp
headers["X-Nonce"] = nonce
headers["X-Signature"] = signature
```

> [!CAUTION]
> Compute the HMAC over the **exact raw JSON bytes** sent as the HTTP body.
> Do not re-serialize or re-format the JSON between signing and sending.

---

## Python Client Pattern (FastAPI / httpx)

```python
# app/core/email.py
import hashlib, hmac, json, logging, time, uuid
from typing import Any, Dict, List, Optional, Union
import httpx
from pydantic import BaseModel, Field, model_validator

logger = logging.getLogger(__name__)

class MailbrixError(Exception): ...
class MailbrixConfigError(MailbrixError): ...
class MailbrixHTTPError(MailbrixError):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"HTTP {status_code}: {detail}")

class EmailMessage(BaseModel):
    to_email: Union[str, List[str]]
    subject: str = Field(..., min_length=1, max_length=998)
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    # ... additional optional fields

    @model_validator(mode="after")
    def validate_body(self):
        if not (self.html_content or "").strip() and not (self.text_content or "").strip():
            raise ValueError("At least one of html_content or text_content required")
        return self

class MailbrixClient:
    def __init__(self, base_url=None, api_key=None, app_id=None,
                 signing_secret=None, timeout=10.0, http_client=None):
        # Read from args or settings/env
        ...

    @staticmethod
    def compute_signature(secret, timestamp, nonce, raw_body):
        message = f"{timestamp}.{nonce}.".encode() + raw_body
        return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()

    async def send(self, message: EmailMessage):
        raw_body = json.dumps(
            message.model_dump(exclude_none=True),
            ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        headers = self._build_headers(raw_body)
        response = await self._http.post(f"{self._url}/send", content=raw_body, headers=headers)
        if response.status_code != 200:
            raise MailbrixHTTPError(response.status_code, response.text[:300])
        return response.json()

# Module-level singleton
mailbrix_client = MailbrixClient()
```

---

## Unit Testing Pattern

```python
import httpx, hmac, hashlib, json, uuid
from app.core.email import MailbrixClient, EmailAttachment

async def test_send_with_hmac(monkeypatch):
    monkeypatch.setattr(settings, "MAILBRIX_URL", "https://test.example.com/")
    monkeypatch.setattr(settings, "MAILBRIX_API_KEY", "test-key")
    monkeypatch.setattr(settings, "MAILBRIX_SIGNING_SECRET", "test-secret")

    captured = {}
    def handler(request):
        captured["headers"] = dict(request.headers)
        captured["body"] = request.content
        return httpx.Response(200, json={"status": "sent", "recipients": ["a@b.com"]})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http:
        client = MailbrixClient(http_client=http)
        result = await client.send_email(to_email="a@b.com", subject="Hi", text_content="Body")

    assert result.status == "sent"

    # Verify HMAC
    h = captured["headers"]
    expected = hmac.new(
        b"test-secret",
        f"{h['x-timestamp']}.{h['x-nonce']}.".encode() + captured["body"],
        hashlib.sha256,
    ).hexdigest()
    assert h["x-signature"] == expected
```

---

## Error Handling Rules

1. **Never log** API keys or signing secrets — log only the error type and
   truncated response body.
2. **Distinguish** config errors (missing URL/key) from HTTP errors (non-200)
   from network errors (timeout, connection refused).
3. **Degrade gracefully** — if email is not configured, log a warning and
   continue (don't crash the calling feature).

---

## Email Template Conventions

- Use inline CSS (no `<style>` blocks) for maximum email client compatibility.
- Font stack: `Georgia, 'Times New Roman', serif` for headings;
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` for body.
- Background: `#FBF9F5` (warm ivory). Card: `#FFFFFF` with `border: 1px solid #E2D9C8`.
- Accent colour: `#C2410C` (burnt orange).
- Always include both `html_content` and `text_content`.
- Always include the editorial creator footer (see `editorial-creator-footer` skill).

---

## Checklist

- [ ] Environment variables added to `.env.example`
- [ ] Email client module created with HMAC signing
- [ ] Convenience `send_email(...)` helper with keyword args
- [ ] Feature-specific email functions (verification, invite, etc.)
- [ ] Unit tests with `httpx.MockTransport` verifying headers and HMAC
- [ ] Error handling: config, HTTP, timeout, network — no secret leaks
- [ ] Both html and text content in every email
- [ ] Creator footer in every email template
