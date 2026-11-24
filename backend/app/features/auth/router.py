# backend/app/features/auth/router.py
import hmac
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, Response
from pydantic import BaseModel
from app.config import settings
from app.storage.provider import get_storage
from app.storage.base import StorageFactory
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
    require_authenticated_user,
)
from app.features.auth.models import SignupRequest, UserResponse

logger = logging.getLogger("molat.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    req: SignupRequest,
    response: Response,
    storage: StorageFactory = Depends(get_storage),
):
    """
    Registers a new reader account with unique email, username handle, and password.
    Emits JWT session token via Authorization and X-Auth-Token response headers.
    """
    if not storage.users:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User registration requires a PostgreSQL database backend.",
        )

    clean_email = req.email.strip().lower()
    clean_username = req.username.strip().lower()
    hashed = hash_password(req.password)
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    role = "reader"

    existing = await storage.users.get_by_email_or_username(clean_email, clean_username)
    if existing:
        if existing.email.lower() == clean_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists",
            )
        if existing.username.lower() == clean_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken. Please choose another handle.",
            )

    created_user = await storage.users.create(
        user_id=user_id,
        email=clean_email,
        username=clean_username,
        password_hash=hashed,
        role=role,
    )

    token = create_access_token(
        username=created_user.username,
        user_id=created_user.id,
        email=created_user.email,
        role=created_user.role,
        expires_days=30,
    )

    response.headers["Authorization"] = f"Bearer {token}"
    response.headers["X-Auth-Token"] = token

    return UserResponse(
        id=created_user.id,
        email=created_user.email,
        username=created_user.username,
        role=created_user.role,
        created_at=created_user.created_at,
    )


class LoginRequest(BaseModel):
    username: Optional[str] = None
    identifier: Optional[str] = None
    password: str


@router.post("/login", response_model=UserResponse)
async def login(
    req: LoginRequest,
    response: Response,
    storage: StorageFactory = Depends(get_storage),
):
    """
    Authenticates a reader via email OR username, or via configured admin credentials.
    Emits JWT session token via Authorization and X-Auth-Token response headers.
    """
    ident = (req.identifier or req.username or "").strip()
    if not ident or not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email/Username and password must not be empty",
        )

    # 1. Configured Admin credentials check
    configured_user = settings.ADMIN_USERNAME
    configured_pass = settings.ADMIN_PASSWORD
    if configured_pass and ident.lower() == configured_user.lower():
        if hmac.compare_digest(req.password.strip(), configured_pass.strip()):
            token = create_access_token(username=configured_user, user_id="usr_admin", role="admin", expires_days=30)
            response.headers["Authorization"] = f"Bearer {token}"
            response.headers["X-Auth-Token"] = token
            return UserResponse(
                id="usr_admin",
                email=f"{configured_user}@molat.local",
                username=configured_user,
                role="admin",
            )

    # 2. Database user lookup (Email or Username)
    if storage.users:
        user_record = await storage.users.get_by_identifier(ident)
        if user_record and verify_password(req.password, user_record.password_hash):
            token = create_access_token(
                username=user_record.username,
                user_id=user_record.id,
                email=user_record.email,
                role=user_record.role,
                expires_days=30,
            )
            response.headers["Authorization"] = f"Bearer {token}"
            response.headers["X-Auth-Token"] = token
            return UserResponse(
                id=user_record.id,
                email=user_record.email,
                username=user_record.username,
                role=user_record.role,
                created_at=user_record.created_at,
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email/username or password",
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user_id: str = Depends(require_authenticated_user),
    storage: StorageFactory = Depends(get_storage),
):
    """Fetches the authenticated user profile."""
    if user_id == "usr_admin":
        return UserResponse(
            id="usr_admin",
            email=f"{settings.ADMIN_USERNAME}@molat.local",
            username=settings.ADMIN_USERNAME,
            role="admin",
        )

    if storage.users:
        user_record = await storage.users.get_by_id(user_id)
        if user_record:
            return UserResponse(
                id=user_record.id,
                email=user_record.email,
                username=user_record.username,
                role=user_record.role,
                created_at=user_record.created_at,
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User profile not found",
    )
