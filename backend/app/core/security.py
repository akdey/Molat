# backend/app/core/security.py
import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any
import bcrypt
from fastapi import Header, HTTPException, status, Request
from app.config import settings


def hash_password(password: str) -> str:
    """Hashes a password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding and padding < 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def create_access_token(
    username: str,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    role: str = "reader",
    expires_days: int = 30
) -> str:
    """Creates HMAC-SHA256 signed bearer token with user_id, email, and role payload."""
    effective_user_id = user_id or f"user_{username}"
    payload = {
        "sub": username,
        "user_id": effective_user_id,
        "email": email or "",
        "role": role,
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
    """Verifies token signature and expiration."""
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


def get_current_user_id(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> str:
    """
    Returns user_id for the request without hardcoded 'owner' fallback.
    1. Reads user_id from request.state (populated by RBACMiddleware).
    2. Validates Bearer token if provided.
    3. Respects explicit X-User-Id header.
    4. Fails fast with 401 if unauthenticated.
    """
    if hasattr(request.state, "user_id") and request.state.user_id:
        return request.state.user_id

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        payload = verify_access_token(token)
        if payload is not None and payload.get("user_id"):
            return payload["user_id"]

    if x_user_id:
        return x_user_id.strip()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please sign in.",
    )


def require_authenticated_user(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> str:
    """Enforces authentication and returns user_id."""
    return get_current_user_id(request=request, authorization=authorization)


def verify_library_key(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> bool:
    """Validates that request is authenticated."""
    uid = get_current_user_id(request=request, authorization=authorization)
    return bool(uid)

