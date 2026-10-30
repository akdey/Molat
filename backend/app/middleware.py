import hmac
from typing import Optional
from fastapi import Header, HTTPException, status
from app.config import settings
from app.services.auth import verify_access_token


def verify_library_key(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_library_key: Optional[str] = Header(None, alias="X-Library-Key"),
) -> bool:
    """
    Enforces authentication for state-modifying requests (POST/PATCH/DELETE).
    Accepts:
    1. 'Authorization: Bearer <signed_token>' (JWT style verified against settings.JWT_SECRET)
    2. 'X-Library-Key: <key>' (matched against settings.LIBRARY_KEY or settings.ADMIN_PASSWORD)
    """
    # 1. Bearer Token Check
    if authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()
        payload = verify_access_token(raw_token)
        if payload is not None:
            return True
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    # 2. X-Library-Key Check
    if x_library_key:
        valid_keys = [k for k in (settings.LIBRARY_KEY, settings.ADMIN_PASSWORD) if k]
        if not valid_keys:
            # If no password or key is configured on server, accept any key in dev mode
            return True
        for key in valid_keys:
            if hmac.compare_digest(x_library_key, key):
                return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid X-Library-Key",
        )

    # If neither key nor password is configured, permit request (open dev mode)
    if not settings.LIBRARY_KEY and not settings.ADMIN_PASSWORD:
        return True

    # Credential required but not provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in or provide X-Library-Key header.",
    )
