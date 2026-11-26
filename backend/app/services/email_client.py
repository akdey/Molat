import os
import uuid
import time
import hmac
import hashlib
import json
from typing import Dict, Any
import httpx
import logging

logger = logging.getLogger(__name__)

class MailbridgeClient:
    def __init__(self):
        self.base_url = os.getenv("MAILBRIDGE_URL", "").rstrip('/')
        self.app_id = os.getenv("MAILBRIDGE_APP_ID")
        self.api_key = os.getenv("MAILBRIDGE_API_KEY")
        self.signing_secret = os.getenv("MAILBRIDGE_SIGNING_SECRET")
        self.timeout = 10  # seconds
        self.http = httpx.AsyncClient(timeout=self.timeout)

    def _sign(self, body_bytes: bytes) -> Dict[str, str]:
        if not self.signing_secret:
            return {}
        timestamp = str(int(time.time()))
        nonce = str(uuid.uuid4())
        payload = f"{timestamp}.{nonce}.{body_bytes.decode('utf-8')}"
        signature = hmac.new(
            self.signing_secret.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        return {
            "X-Timestamp": timestamp,
            "X-Nonce": nonce,
            "X-Signature": signature,
        }

    async def send_email(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.base_url:
            raise RuntimeError("MAILBRIDGE_URL not set")
        url = f"{self.base_url}/send"
        # Ensure compact JSON without spaces to match raw bytes for signing
        body = json.dumps(payload, separators=(",", ":")).encode()
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key or "",
        }
        if self.app_id:
            headers["X-App-Id"] = self.app_id
        headers.update(self._sign(body))
        try:
            response = await self.http.post(url, content=body, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error("Mailbridge request failed: %s", str(exc))
            raise
