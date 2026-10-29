import hmac
from typing import Optional
from fastapi import HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def verify_owner_token(provided_token: str) -> bool:
    """Constant-time token verification to prevent timing attacks."""
    if not settings.OWNER_AUTH_TOKEN:
        # If no owner token is configured (e.g. initial setup / local development), allow access
        return True
    return hmac.compare_digest(provided_token, settings.OWNER_AUTH_TOKEN)


async def get_current_owner(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> bool:
    """
    Enforces authentication on protected endpoints.
    Accepts:
    1. Authorization: Bearer <token>
    2. Cookie: molat_session=<token>
    """
    if not settings.OWNER_AUTH_TOKEN:
        return True

    token: Optional[str] = None
    if auth and auth.credentials:
        token = auth.credentials
    else:
        # Check session cookie
        token = request.cookies.get(settings.SESSION_COOKIE_NAME)

    if not token or not verify_owner_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Invalid or missing owner token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True

