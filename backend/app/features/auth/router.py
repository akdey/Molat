# backend/app/features/auth/router.py
import hmac
import logging
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from app.config import settings
from app.core.database import db_manager
from app.core.security import (
    create_access_token,
    verify_access_token,
    hash_password,
    verify_password,
    require_authenticated_user,
    verify_library_key,
)
from app.features.auth.models import SignupRequest, LoginRequest, UserResponse, AuthResponse

logger = logging.getLogger("molat.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory user store fallback for local/test execution without PostgreSQL
_IN_MEMORY_USERS: Dict[str, Dict[str, Any]] = {
    "usr_admin": {
        "id": "usr_admin",
        "email": "admin@molat.local",
        "username": "admin",
        "role": "admin",
        "password_hash": hash_password("secret123"),
        "created_at": "2026-01-01T00:00:00Z",
    }
}


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest):
    """
    Registers a new reader account with unique email, username handle, and password.
    Returns JWT session token with instant access (no email verification barrier).
    """
    clean_email = req.email.strip().lower()
    clean_username = req.username.strip().lower()
    hashed = hash_password(req.password)
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    role = "reader"

    if db_manager.is_connected and db_manager.pool:
        async with db_manager.pool.acquire() as conn:
            # Check uniqueness of email and username
            existing = await conn.fetchrow(
                """
                SELECT id, email, username 
                FROM users 
                WHERE LOWER(email) = $1 OR LOWER(username) = $2
                """,
                clean_email, clean_username
            )
            if existing:
                if existing["email"] and existing["email"].lower() == clean_email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="An account with this email already exists",
                    )
                if existing["username"] and existing["username"].lower() == clean_username:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This username is already taken. Please choose another handle.",
                    )

            # Insert new user record
            row = await conn.fetchrow(
                """
                INSERT INTO users (id, email, username, role, password_hash)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, email, username, role, created_at
                """,
                user_id, clean_email, clean_username, role, hashed
            )

            # Seed default reading settings
            await conn.execute(
                """
                INSERT INTO user_settings (user_id, daily_goal_pages, theme)
                VALUES ($1, 15, 'light')
                ON CONFLICT (user_id) DO NOTHING
                """,
                user_id
            )

            created_user = UserResponse(
                id=row["id"],
                email=row["email"],
                username=row["username"],
                role=row.get("role") or role,
                created_at=str(row["created_at"]) if row["created_at"] else None,
            )
    else:
        # In-memory fallback
        for u in _IN_MEMORY_USERS.values():
            if u.get("email") and u["email"].lower() == clean_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email already exists",
                )
            if u.get("username") and u["username"].lower() == clean_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This username is already taken. Please choose another handle.",
                )

        _IN_MEMORY_USERS[user_id] = {
            "id": user_id,
            "email": clean_email,
            "username": clean_username,
            "role": role,
            "password_hash": hashed,
            "created_at": "2026-11-24T00:00:00Z",
        }
        created_user = UserResponse(
            id=user_id,
            email=clean_email,
            username=clean_username,
            role=role,
            created_at="2026-11-24T00:00:00Z",
        )

    token = create_access_token(
        username=created_user.username,
        user_id=created_user.id,
        email=created_user.email,
        role=created_user.role,
        expires_days=30,
    )

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=created_user,
        expires_in_days=30,
    )


class LegacyLoginRequest(BaseModel):
    username: Optional[str] = None
    identifier: Optional[str] = None
    password: str


@router.post("/login", response_model=AuthResponse)
async def login(req: LegacyLoginRequest):
    """
    Authenticates a reader via email OR username, or via legacy admin credentials.
    """
    ident = (req.identifier or req.username or "").strip()
    if not ident or not req.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email/Username and password must not be empty",
        )

    # 1. Database user lookup (Email or Username)
    if db_manager.is_connected and db_manager.pool:
        async with db_manager.pool.acquire() as conn:
            user_row = await conn.fetchrow(
                """
                SELECT id, email, username, role, password_hash, created_at
                FROM users
                WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
                """,
                ident
            )
            if user_row and user_row["password_hash"]:
                if verify_password(req.password, user_row["password_hash"]):
                    user_role = user_row.get("role") or "reader"
                    token = create_access_token(
                        username=user_row["username"],
                        user_id=user_row["id"],
                        email=user_row["email"],
                        role=user_role,
                        expires_days=30,
                    )
                    return AuthResponse(
                        access_token=token,
                        token_type="bearer",
                        user=UserResponse(
                            id=user_row["id"],
                            email=user_row["email"],
                            username=user_row["username"],
                            role=user_role,
                            created_at=str(user_row["created_at"]) if user_row["created_at"] else None,
                        ),
                        expires_in_days=30,
                    )

    # 2. In-Memory user lookup
    for u in _IN_MEMORY_USERS.values():
        if (u.get("email") and u["email"].lower() == ident.lower()) or (u.get("username") and u["username"].lower() == ident.lower()):
            if verify_password(req.password, u["password_hash"]):
                user_role = u.get("role") or "reader"
                token = create_access_token(
                    username=u["username"],
                    user_id=u["id"],
                    email=u["email"],
                    role=user_role,
                    expires_days=30,
                )
                return AuthResponse(
                    access_token=token,
                    token_type="bearer",
                    user=UserResponse(
                        id=u["id"],
                        email=u["email"],
                        username=u["username"],
                        role=user_role,
                        created_at=u.get("created_at"),
                    ),
                    expires_in_days=30,
                )

    # 3. Admin credentials check (configured in settings)
    configured_user = settings.ADMIN_USERNAME
    configured_pass = settings.ADMIN_PASSWORD
    if configured_pass and ident.lower() == configured_user.lower():
        if hmac.compare_digest(req.password.strip(), configured_pass.strip()):
            token = create_access_token(username=configured_user, user_id="usr_admin", role="admin", expires_days=30)
            return AuthResponse(
                access_token=token,
                token_type="bearer",
                user=UserResponse(
                    id="usr_admin",
                    email=f"{configured_user}@molat.local",
                    username=configured_user,
                    role="admin",
                ),
                expires_in_days=30,
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email/username or password",
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user_id: str = Depends(require_authenticated_user)):
    """Fetches the authenticated user profile."""
    if db_manager.is_connected and db_manager.pool:
        async with db_manager.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, username, role, created_at
                FROM users
                WHERE id = $1
                """,
                user_id
            )
            if row:
                return UserResponse(
                    id=row["id"],
                    email=row["email"],
                    username=row["username"],
                    role=row.get("role") or "reader",
                    created_at=str(row["created_at"]) if row["created_at"] else None,
                )

    # In-memory lookup
    if user_id in _IN_MEMORY_USERS:
        u = _IN_MEMORY_USERS[user_id]
        return UserResponse(
            id=u["id"],
            email=u.get("email"),
            username=u["username"],
            role=u.get("role") or "reader",
            created_at=u.get("created_at"),
        )

    return UserResponse(
        id=user_id,
        email="user@molat.local",
        username=user_id,
        role="reader",
    )
