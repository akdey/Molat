# backend/app/features/auth/models.py
import re
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class SignupRequest(BaseModel):
    email: str = Field(..., description="Unique email address")
    username: str = Field(..., min_length=3, max_length=30, description="Public reader handle (e.g. amit, reader_99)")
    password: str = Field(..., min_length=6, description="Account password (minimum 6 characters)")
    display_name: Optional[str] = Field(None, max_length=100, description="Friendly reader name")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        s = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s):
            raise ValueError("Invalid email format")
        return s

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        s = v.strip().lower()
        if not re.match(r"^[a-z0-9_-]{3,30}$", s):
            raise ValueError("Username must be 3-30 characters with lowercase letters, numbers, hyphens or underscores only")
        return s

    @field_validator("display_name")
    @classmethod
    def clean_display_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        return s if s else None


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or Username")
    password: str = Field(..., min_length=1, description="Password")


class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    username: str
    display_name: Optional[str] = None
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in_days: int = 30
