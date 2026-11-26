# backend/tests/test_email.py
import hashlib
import hmac
import json
import logging
import uuid
from unittest.mock import AsyncMock

import httpx
import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.core.email import (
    EmailAttachment,
    EmailMessage,
    MailbridgeClient,
    MailbridgeConfigError,
    MailbridgeError,
    MailbridgeHTTPError,
)


@pytest.mark.asyncio
async def test_send_email_success_with_hmac_and_full_payload(monkeypatch):
    monkeypatch.setattr(settings, "MAILBRIDGE_URL", "https://mailbridge-akdey.vercel.app/")
    monkeypatch.setattr(settings, "MAILBRIDGE_APP_ID", "molat")
    monkeypatch.setattr(settings, "MAILBRIDGE_API_KEY", "secret-api-key-123")
    monkeypatch.setattr(settings, "MAILBRIDGE_SIGNING_SECRET", "super-hmac-secret-456")

    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        captured["raw_body"] = request.content
        return httpx.Response(
            200,
            json={
                "status": "sent",
                "request_id": "req_abc123",
                "app_id": "molat",
                "recipients": ["reader@example.com"],
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = MailbridgeClient(http_client=http_client)
        result = await client.send_email(
            to_email=["reader@example.com"],
            subject="Welcome to the Dey Family Alcove",
            html_content="<p>Hello Reader</p>",
            text_content="Hello Reader",
            reply_to="curator@example.com",
            cc=["spouse@example.com"],
            bcc=["archive@example.com"],
            attachments=[
                EmailAttachment(
                    filename="bookplate.txt",
                    content="SGVsbG8=",
                    content_type="text/plain",
                )
            ],
        )

    assert result.status == "sent"
    assert result.request_id == "req_abc123"
    assert result.app_id == "molat"
    assert result.recipients == ["reader@example.com"]

    assert captured["url"] == "https://mailbridge-akdey.vercel.app/send"
    headers = {k.lower(): v for k, v in captured["headers"].items()}
    assert headers["content-type"] == "application/json"
    assert headers["x-api-key"] == "secret-api-key-123"
    assert headers["x-app-id"] == "molat"

    # Verify HMAC-SHA256 signature over exact raw JSON body bytes
    timestamp = headers["x-timestamp"]
    nonce = headers["x-nonce"]
    signature = headers["x-signature"]

    assert int(timestamp) > 0
    uuid.UUID(nonce)  # Must be a valid UUID

    expected_message = f"{timestamp}.{nonce}.".encode("utf-8") + captured["raw_body"]
    expected_sig = hmac.new(
        b"super-hmac-secret-456",
        expected_message,
        hashlib.sha256,
    ).hexdigest()
    assert signature == expected_sig

    parsed_body = json.loads(captured["raw_body"].decode("utf-8"))
    assert parsed_body["to_email"] == ["reader@example.com"]
    assert parsed_body["subject"] == "Welcome to the Dey Family Alcove"
    assert parsed_body["html_content"] == "<p>Hello Reader</p>"
    assert parsed_body["text_content"] == "Hello Reader"
    assert parsed_body["reply_to"] == "curator@example.com"
    assert parsed_body["cc"] == ["spouse@example.com"]
    assert parsed_body["bcc"] == ["archive@example.com"]
    assert parsed_body["attachments"][0]["filename"] == "bookplate.txt"


@pytest.mark.asyncio
async def test_send_email_without_optional_app_id_and_signing_secret(monkeypatch):
    monkeypatch.setattr(settings, "MAILBRIDGE_URL", "https://mailbridge-akdey.vercel.app")
    monkeypatch.setattr(settings, "MAILBRIDGE_APP_ID", None)
    monkeypatch.setattr(settings, "MAILBRIDGE_API_KEY", "secret-api-key-123")
    monkeypatch.setattr(settings, "MAILBRIDGE_SIGNING_SECRET", None)

    captured_headers = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured_headers.update({k.lower(): v for k, v in request.headers.items()})
        return httpx.Response(200, json={"status": "sent", "recipients": ["a@b.com"]})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = MailbridgeClient(http_client=http_client)
        result = await client.send_email(
            to_email="a@b.com",
            subject="Plain Test",
            text_content="Just plain text",
        )

    assert result.status == "sent"
    assert captured_headers["x-api-key"] == "secret-api-key-123"
    assert "x-app-id" not in captured_headers
    assert "x-timestamp" not in captured_headers
    assert "x-nonce" not in captured_headers
    assert "x-signature" not in captured_headers


@pytest.mark.asyncio
async def test_missing_config_raises_config_error(monkeypatch):
    monkeypatch.setattr(settings, "MAILBRIDGE_URL", None)
    monkeypatch.setattr(settings, "MAILBRIDGE_API_KEY", "key")

    client = MailbridgeClient()
    with pytest.raises(MailbridgeConfigError, match="MAILBRIDGE_URL"):
        await client.send_email(to_email="a@b.com", subject="Hi", text_content="Body")

    monkeypatch.setattr(settings, "MAILBRIDGE_URL", "https://mailbridge-akdey.vercel.app")
    monkeypatch.setattr(settings, "MAILBRIDGE_API_KEY", "")
    with pytest.raises(MailbridgeConfigError, match="MAILBRIDGE_API_KEY"):
        await client.send_email(to_email="a@b.com", subject="Hi", text_content="Body")


def test_email_message_validation():
    with pytest.raises(ValidationError):
        EmailMessage(to_email="a@b.com", subject="Missing Body")

    with pytest.raises(ValidationError):
        EmailMessage(to_email="a@b.com", subject="", text_content="Body")

    with pytest.raises(ValidationError):
        EmailMessage(to_email="a@b.com", subject="x" * 999, text_content="Body")


@pytest.mark.asyncio
async def test_non_200_response_raises_and_never_logs_secrets(monkeypatch, caplog):
    api_secret = "super-secret-api-key-do-not-log"
    hmac_secret = "super-secret-hmac-do-not-log"
    monkeypatch.setattr(settings, "MAILBRIDGE_URL", "https://mailbridge-akdey.vercel.app")
    monkeypatch.setattr(settings, "MAILBRIDGE_APP_ID", "molat")
    monkeypatch.setattr(settings, "MAILBRIDGE_API_KEY", api_secret)
    monkeypatch.setattr(settings, "MAILBRIDGE_SIGNING_SECRET", hmac_secret)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text='{"detail":"Invalid API key"}')

    transport = httpx.MockTransport(handler)
    with caplog.at_level(logging.ERROR):
        async with httpx.AsyncClient(transport=transport) as http_client:
            client = MailbridgeClient(http_client=http_client)
            with pytest.raises(MailbridgeHTTPError) as exc_info:
                await client.send_email(to_email="a@b.com", subject="Test", text_content="Body")

    assert exc_info.value.status_code == 401
    assert api_secret not in caplog.text
    assert hmac_secret not in caplog.text
    assert api_secret not in str(exc_info.value)
    assert hmac_secret not in str(exc_info.value)


@pytest.mark.asyncio
async def test_timeout_and_network_error_handling(monkeypatch, caplog):
    api_secret = "super-secret-api-key-do-not-log"
    hmac_secret = "super-secret-hmac-do-not-log"
    monkeypatch.setattr(settings, "MAILBRIDGE_URL", "https://mailbridge-akdey.vercel.app")
    monkeypatch.setattr(settings, "MAILBRIDGE_API_KEY", api_secret)
    monkeypatch.setattr(settings, "MAILBRIDGE_SIGNING_SECRET", hmac_secret)

    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.post.side_effect = httpx.TimeoutException("Read timed out")

    client = MailbridgeClient(http_client=mock_http, timeout=2.5)
    with caplog.at_level(logging.ERROR):
        with pytest.raises(MailbridgeError, match="timed out"):
            await client.send_email(to_email="a@b.com", subject="Test", text_content="Body")

    assert api_secret not in caplog.text
    assert hmac_secret not in caplog.text

    mock_http.post.side_effect = httpx.ConnectError("Connection refused")
    with caplog.at_level(logging.ERROR):
        with pytest.raises(MailbridgeError, match="ConnectError"):
            await client.send_email(to_email="a@b.com", subject="Test", text_content="Body")

    assert api_secret not in caplog.text
    assert hmac_secret not in caplog.text
