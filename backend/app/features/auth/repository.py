# backend/app/features/auth/repository.py
from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel


class UserRecord(BaseModel):
    id: str
    email: str
    username: str
    password_hash: str
    role: str = "reader"
    created_at: Optional[str] = None


class UserRepository(ABC):
    """Abstract user repository interface."""

    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[UserRecord]:
        """Fetches a user record by primary key id."""
        ...

    @abstractmethod
    async def get_by_identifier(self, identifier: str) -> Optional[UserRecord]:
        """Fetches a user record by either email or username."""
        ...

    @abstractmethod
    async def get_by_email_or_username(self, email: str, username: str) -> Optional[UserRecord]:
        """Checks if a user already exists with either this email or username."""
        ...

    @abstractmethod
    async def create(
        self, user_id: str, email: str, username: str, password_hash: str, role: str = "reader"
    ) -> UserRecord:
        """Persists a new user record."""
        ...
