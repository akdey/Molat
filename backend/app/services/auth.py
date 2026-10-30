import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any
from app.config import settings


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding and padding < 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def create_access_token(username: str, expires_days: int = 30) -> str:
    """
    Creates an HMAC-SHA256 signed bearer token valid for expires_days.
    Zero external dependencies, purely using Python standard library.
    """
    payload = {
        "sub": username,
        "exp": int(time.time()) + (expires_days * 86400),
        "iat": int(time.time()),
    }
    header = {"alg": "HS256", "typ": "JWT"}

    header_b64 = _b64_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _b64_encode(json.dumps(payload).encode("utf-8"))
    message = f"{header_b64}.{payload_b64}".encode("utf-8")

    secret = settings.JWT_SECRET.encode("utf-8")
    signature = hmac.new(secret, message, hashlib.sha256).digest()
    signature_b64 = _b64_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies token signature and expiration. Returns payload if valid, None otherwise.
    """
    parts = token.strip().split(".")
    if len(parts) != 3:
        return None

    header_b64, payload_b64, signature_b64 = parts
    message = f"{header_b64}.{payload_b64}".encode("utf-8")
    secret = settings.JWT_SECRET.encode("utf-8")

    expected_signature = hmac.new(secret, message, hashlib.sha256).digest()
    expected_b64 = _b64_encode(expected_signature)

    if not hmac.compare_digest(signature_b64, expected_b64):
        return None

    try:
        payload_bytes = _b64_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return None

    if "exp" in payload and payload["exp"] < time.time():
        return None

    return payload
