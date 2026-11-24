# backend/app/features/auth/postgres_repo.py
import asyncpg
from typing import Optional
from app.features.auth.repository import UserRepository, UserRecord


class PostgresUserRepository(UserRepository):
    """Concrete PostgreSQL user repository backed by asyncpg pool."""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def get_by_id(self, user_id: str) -> Optional[UserRecord]:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, username, password_hash, role, created_at FROM users WHERE id = $1",
                user_id,
            )
            if row:
                return UserRecord(
                    id=row["id"],
                    email=row["email"],
                    username=row["username"],
                    password_hash=row["password_hash"],
                    role=row.get("role") or "reader",
                    created_at=str(row["created_at"]) if row["created_at"] else None,
                )
            return None

    async def get_by_identifier(self, identifier: str) -> Optional[UserRecord]:
        clean = identifier.strip().lower()
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, username, password_hash, role, created_at
                FROM users
                WHERE LOWER(email) = $1 OR LOWER(username) = $1
                """,
                clean,
            )
            if row:
                return UserRecord(
                    id=row["id"],
                    email=row["email"],
                    username=row["username"],
                    password_hash=row["password_hash"],
                    role=row.get("role") or "reader",
                    created_at=str(row["created_at"]) if row["created_at"] else None,
                )
            return None

    async def get_by_email_or_username(self, email: str, username: str) -> Optional[UserRecord]:
        clean_email = email.strip().lower()
        clean_username = username.strip().lower()
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, username, password_hash, role, created_at
                FROM users
                WHERE LOWER(email) = $1 OR LOWER(username) = $2
                """,
                clean_email,
                clean_username,
            )
            if row:
                return UserRecord(
                    id=row["id"],
                    email=row["email"],
                    username=row["username"],
                    password_hash=row["password_hash"],
                    role=row.get("role") or "reader",
                    created_at=str(row["created_at"]) if row["created_at"] else None,
                )
            return None

    async def create(
        self, user_id: str, email: str, username: str, password_hash: str, role: str = "reader"
    ) -> UserRecord:
        clean_email = email.strip().lower()
        clean_username = username.strip().lower()
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    INSERT INTO users (id, email, username, role, password_hash)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, email, username, role, created_at
                    """,
                    user_id,
                    clean_email,
                    clean_username,
                    role,
                    password_hash,
                )
                await conn.execute(
                    """
                    INSERT INTO user_settings (user_id, daily_goal_pages, theme)
                    VALUES ($1, 15, 'light')
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    user_id,
                )
                return UserRecord(
                    id=row["id"],
                    email=row["email"],
                    username=row["username"],
                    password_hash=password_hash,
                    role=row.get("role") or role,
                    created_at=str(row["created_at"]) if row["created_at"] else None,
                )
