# backend/app/features/auth/router.py
import hmac
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Response
from pydantic import BaseModel
from app.config import settings
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
    require_authenticated_user,
)
from app.features.auth.models import SignupRequest, UserResponse
from app.features.auth.repository import UserRepository
from app.features.auth.dependencies import get_user_repository

logger = logging.getLogger("molat.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    req: SignupRequest,
    response: Response,
    user_repo: UserRepository = Depends(get_user_repository),
):
    """
    Registers a new reader account with unique email, username handle, and password.
    Emits JWT session token via Authorization and X-Auth-Token response headers.
    """
    clean_email = req.email.strip().lower()
    clean_username = req.username.strip().lower()
    hashed = hash_password(req.password)
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    role = "reader"

    existing = await user_repo.get_by_email_or_username(clean_email, clean_username)
    if existing:
        if existing.email.lower() == clean_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken. Please choose another username.",
        )

    user = await user_repo.create(
        user_id=user_id,
        email=clean_email,
        username=clean_username,
        password_hash=hashed,
        role=role,
    )

    token = create_access_token(username=user.username, user_id=user.id, role=user.role, email=user.email)
    response.headers["Authorization"] = f"Bearer {token}"
    response.headers["X-Auth-Token"] = token

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        created_at=user.created_at,
    )


class LoginPayload(BaseModel):
    identifier: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: str


@router.post("/login", response_model=UserResponse)
async def login(
    payload: LoginPayload,
    response: Response,
    user_repo: UserRepository = Depends(get_user_repository),
):
    """
    Authenticates a reader via email or username (or admin password fallback).
    Emits JWT session token via Authorization and X-Auth-Token response headers.
    """
    identifier = (payload.identifier or payload.username or payload.email or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required",
        )

    # 1. Admin legacy credentials check
    if (
        settings.ADMIN_PASSWORD
        and settings.ADMIN_USERNAME
        and identifier.lower() == settings.ADMIN_USERNAME.lower()
        and hmac.compare_digest(payload.password, settings.ADMIN_PASSWORD)
    ):
        token = create_access_token(username=settings.ADMIN_USERNAME, user_id="owner", role="admin")
        response.headers["Authorization"] = f"Bearer {token}"
        response.headers["X-Auth-Token"] = token
        return UserResponse(
            id="owner",
            email="owner@molat.internal",
            username=settings.ADMIN_USERNAME,
            role="admin",
        )

    # 2. Database user credentials check
    user = await user_repo.get_by_identifier(identifier)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
        )

    token = create_access_token(username=user.username, user_id=user.id, role=user.role, email=user.email)
    response.headers["Authorization"] = f"Bearer {token}"
    response.headers["X-Auth-Token"] = token

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user_id: str = Depends(require_authenticated_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Returns the authenticated user's profile."""
    # Handle legacy admin owner session
    if user_id == "owner":
        return UserResponse(
            id="owner",
            email="owner@molat.internal",
            username=settings.ADMIN_USERNAME,
            role="admin",
        )

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        created_at=user.created_at,
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user_id: str = Depends(require_authenticated_user),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Securely updates password for the authenticated reader."""
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long",
        )

    # Legacy admin check
    if user_id == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin credentials are managed via environment variables.",
        )

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found",
        )

    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match",
        )

    await user_repo.update_password(user_id, hash_password(req.new_password))
    return {"status": "success", "message": "Password updated successfully"}
