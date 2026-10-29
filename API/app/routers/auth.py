from fastapi import APIRouter, Response, HTTPException, Request, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import verify_owner_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    token: str


class AuthStatusResponse(BaseModel):
    authenticated: bool
    auth_enforced: bool


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    """Verifies owner token and sets HttpOnly session cookie."""
    if not settings.OWNER_AUTH_TOKEN:
        # If no owner token configured, treat as authenticated
        return {"message": "Authentication not required (local mode)"}

    if not verify_owner_token(req.token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid owner token",
        )

    # Set secure session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=req.token,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )
    return {"message": "Authenticated successfully"}


@router.post("/logout")
async def logout(response: Response):
    """Clears the owner session cookie."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
    )
    return {"message": "Signed out"}


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(request: Request):
    """Reports whether the current session is authenticated."""
    if not settings.OWNER_AUTH_TOKEN:
        return AuthStatusResponse(authenticated=True, auth_enforced=False)

    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    is_valid = bool(token and verify_owner_token(token))
    return AuthStatusResponse(authenticated=is_valid, auth_enforced=True)

