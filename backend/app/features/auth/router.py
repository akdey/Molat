# backend/app/features/auth/router.py
import hmac
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from app.config import settings
from app.core.security import create_access_token, verify_library_key

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    expires_in_days: int = 30


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """Authenticates user against ADMIN_USERNAME and ADMIN_PASSWORD."""
    configured_user = settings.ADMIN_USERNAME
    configured_pass = settings.ADMIN_PASSWORD or settings.LIBRARY_KEY

    if configured_pass:
        is_user_valid = hmac.compare_digest(req.username.strip(), configured_user.strip())
        is_pass_valid = hmac.compare_digest(req.password.strip(), configured_pass.strip())

        if not (is_user_valid and is_pass_valid):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )
    else:
        if not req.username.strip() or not req.password.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username and password must not be empty",
            )

    token = create_access_token(username=req.username.strip(), expires_days=30)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        username=req.username.strip(),
        expires_in_days=30,
    )


@router.get("/me")
async def get_current_user(_: bool = Depends(verify_library_key)):
    """Verifies that the caller's session token is valid."""
    return {"authenticated": True, "username": settings.ADMIN_USERNAME}
