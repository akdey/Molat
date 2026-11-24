# backend/app/core/security.py
import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any
import bcrypt
from fastapi import Header, HTTPException, status
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
    expires_days: int = 30
) -> str:
    """Creates HMAC-SHA256 signed bearer token with user_id and email payload."""
    effective_user_id = user_id or ("owner" if username == settings.ADMIN_USERNAME else f"user_{username}")
    payload = {
        "sub": username,
        "user_id": effective_user_id,
        "email": email or "",
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
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_library_key: Optional[str] = Header(None, alias="X-Library-Key"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> str:
    """
    Returns user_id for the request.
    If authenticated via Bearer token -> extracts user_id.
    If X-Library-Key matches -> 'owner'.
    If X-User-Id header provided -> x_user_id.
    Defaults to 'owner' (public default view).
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        payload = verify_access_token(token)
        if payload is not None:
            return payload.get("user_id") or "owner"

    if x_library_key:
        valid_keys = [k for k in (settings.LIBRARY_KEY, settings.ADMIN_PASSWORD) if k]
        for key in valid_keys:
            if hmac.compare_digest(x_library_key, key):
                return "owner"

    if x_user_id:
        return x_user_id.strip()

    return "owner"


def require_authenticated_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_library_key: Optional[str] = Header(None, alias="X-Library-Key"),
) -> str:
    """Enforces authentication and returns user_id."""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        payload = verify_access_token(token)
        if payload is not None:
            return payload.get("user_id") or "owner"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    if x_library_key:
        valid_keys = [k for k in (settings.LIBRARY_KEY, settings.ADMIN_PASSWORD) if k]
        if not valid_keys:
            return "owner"
        for key in valid_keys:
            if hmac.compare_digest(x_library_key, key):
                return "owner"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid X-Library-Key",
        )

    if not settings.LIBRARY_KEY and not settings.ADMIN_PASSWORD:
        return "owner"

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in or provide X-Library-Key header.",
    )


def verify_library_key(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_library_key: Optional[str] = Header(None, alias="X-Library-Key"),
) -> bool:
    """Backward compatibility wrapper returning bool."""
    require_authenticated_user(authorization=authorization, x_library_key=x_library_key)
    return True
