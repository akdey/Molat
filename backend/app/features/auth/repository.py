# backend/app/features/auth/repository.py
from typing import Optional
from dataclasses import dataclass
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.auth.entity import UserEntity
from app.features.settings.entity import UserSettingsEntity


@dataclass
class UserRecord:
    id: str
    email: str
    username: str
    password_hash: str
    role: str = "reader"
    created_at: Optional[str] = None


class UserRepository:
    """SQLAlchemy 2.0 async repository for User management."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: str) -> Optional[UserRecord]:
        stmt = select(UserEntity).where(UserEntity.id == user_id)
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()
        if entity:
            return UserRecord(
                id=entity.id,
                email=entity.email,
                username=entity.username,
                password_hash=entity.password_hash,
                role=entity.role or "reader",
                created_at=str(entity.created_at) if entity.created_at else None,
            )
        return None

    async def get_by_identifier(self, identifier: str) -> Optional[UserRecord]:
        clean = identifier.strip().lower()
        stmt = select(UserEntity).where(
            or_(
                func.lower(UserEntity.email) == clean,
                func.lower(UserEntity.username) == clean,
            )
        )
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()
        if entity:
            return UserRecord(
                id=entity.id,
                email=entity.email,
                username=entity.username,
                password_hash=entity.password_hash,
                role=entity.role or "reader",
                created_at=str(entity.created_at) if entity.created_at else None,
            )
        return None

    async def get_by_email_or_username(self, email: str, username: str) -> Optional[UserRecord]:
        clean_email = email.strip().lower()
        clean_username = username.strip().lower()
        stmt = select(UserEntity).where(
            or_(
                func.lower(UserEntity.email) == clean_email,
                func.lower(UserEntity.username) == clean_username,
            )
        )
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()
        if entity:
            return UserRecord(
                id=entity.id,
                email=entity.email,
                username=entity.username,
                password_hash=entity.password_hash,
                role=entity.role or "reader",
                created_at=str(entity.created_at) if entity.created_at else None,
            )
        return None

    async def create(
        self, user_id: str, email: str, username: str, password_hash: str, role: str = "reader"
    ) -> UserRecord:
        clean_email = email.strip().lower()
        clean_username = username.strip().lower()
        user_entity = UserEntity(
            id=user_id,
            email=clean_email,
            username=clean_username,
            password_hash=password_hash,
            role=role,
        )
        self.session.add(user_entity)

        # Initialize default user settings for the new account
        settings_check = await self.session.get(UserSettingsEntity, user_id)
        if not settings_check:
            self.session.add(UserSettingsEntity(user_id=user_id, daily_goal_pages=15, theme="light"))

        await self.session.commit()
        await self.session.refresh(user_entity)
        return UserRecord(
            id=user_entity.id,
            email=user_entity.email,
            username=user_entity.username,
            password_hash=user_entity.password_hash,
            role=user_entity.role,
            created_at=str(user_entity.created_at) if user_entity.created_at else None,
        )

    async def update_password(self, user_id: str, new_password_hash: str) -> bool:
        stmt = select(UserEntity).where(UserEntity.id == user_id)
        result = await self.session.execute(stmt)
        user_entity = result.scalar_one_or_none()
        if user_entity:
            user_entity.password_hash = new_password_hash
            await self.session.commit()
            return True
        return False
