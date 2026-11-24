# backend/app/features/auth/memory_repo.py
from datetime import datetime, timezone
from typing import Optional, Dict
from app.features.auth.repository import UserRepository, UserRecord


class MemoryUserRepository(UserRepository):
    """Concrete in-memory user repository for testing."""

    def __init__(self):
        self._users_by_id: Dict[str, UserRecord] = {}

    async def get_by_id(self, user_id: str) -> Optional[UserRecord]:
        return self._users_by_id.get(user_id)

    async def get_by_identifier(self, identifier: str) -> Optional[UserRecord]:
        clean = identifier.strip().lower()
        for u in self._users_by_id.values():
            if u.email.lower() == clean or u.username.lower() == clean:
                return u
        return None

    async def get_by_email_or_username(self, email: str, username: str) -> Optional[UserRecord]:
        clean_email = email.strip().lower()
        clean_user = username.strip().lower()
        for u in self._users_by_id.values():
            if u.email.lower() == clean_email or u.username.lower() == clean_user:
                return u
        return None

    async def create(
        self, user_id: str, email: str, username: str, password_hash: str, role: str = "reader"
    ) -> UserRecord:
        record = UserRecord(
            id=user_id,
            email=email.strip().lower(),
            username=username.strip().lower(),
            password_hash=password_hash,
            role=role,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self._users_by_id[user_id] = record
        return record
