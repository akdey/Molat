import hmac
from typing import Optional
from fastapi import Header, HTTPException, status
from app.config import settings


def verify_library_key(x_library_key: Optional[str] = Header(None, alias="X-Library-Key")) -> bool:
    """
    Enforces authentication for state-modifying requests (POST/PATCH/DELETE).
    If settings.LIBRARY_KEY is not set (e.g. local dev / test), access is granted.
    Otherwise, compares headers using timing-safe hmac.compare_digest.
    """
    if not settings.LIBRARY_KEY:
        return True

    if not x_library_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required header: X-Library-Key",
        )

    if not hmac.compare_digest(x_library_key, settings.LIBRARY_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid X-Library-Key",
        )

    return True

