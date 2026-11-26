# backend/app/features/auth/repository.py
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, or_, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.auth.entity import UserEntity, EmailVerificationEntity
from app.features.settings.entity import UserSettingsEntity


@dataclass
class UserRecord:
    id: str
    email: str
    username: str
    password_hash: str
    role: str = "reader"
    email_verified: bool = False
    created_at: Optional[str] = None


def _to_user_record(entity: UserEntity) -> UserRecord:
    return UserRecord(
        id=entity.id,
        email=entity.email,
        username=entity.username,
        password_hash=entity.password_hash,
        role=entity.role or "reader",
        email_verified=bool(getattr(entity, "email_verified", False)),
        created_at=str(entity.created_at) if entity.created_at else None,
    )


def _as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


class UserRepository:
    """SQLAlchemy 2.0 async repository for User management & email verification."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: str) -> Optional[UserRecord]:
        stmt = select(UserEntity).where(UserEntity.id == user_id)
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()
        return _to_user_record(entity) if entity else None

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
        return _to_user_record(entity) if entity else None

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
        return _to_user_record(entity) if entity else None

    async def create(
        self,
        user_id: str,
        email: str,
        username: str,
        password_hash: str,
        role: str = "reader",
        email_verified: bool = False,
    ) -> UserRecord:
        clean_email = email.strip().lower()
        clean_username = username.strip().lower()
        user_entity = UserEntity(
            id=user_id,
            email=clean_email,
            username=clean_username,
            password_hash=password_hash,
            role=role,
            email_verified=email_verified,
        )
        self.session.add(user_entity)

        # Initialize default user settings for the new account
        settings_check = await self.session.get(UserSettingsEntity, user_id)
        if not settings_check:
            self.session.add(UserSettingsEntity(user_id=user_id, daily_goal_pages=15, theme="light"))

        await self.session.commit()
        await self.session.refresh(user_entity)
        return _to_user_record(user_entity)

    async def update_password(self, user_id: str, new_password_hash: str) -> bool:
        stmt = select(UserEntity).where(UserEntity.id == user_id)
        result = await self.session.execute(stmt)
        user_entity = result.scalar_one_or_none()
        if user_entity:
            user_entity.password_hash = new_password_hash
            await self.session.commit()
            return True
        return False

    async def create_verification_token(
        self, user_id: str, email: str, ttl_minutes: int = 15
    ) -> tuple[str, str]:
        """Invalidate prior unused tokens and create a new 6-digit OTP + link token."""
        now = datetime.now(timezone.utc)
        await self.session.execute(
            update(EmailVerificationEntity)
            .where(
                EmailVerificationEntity.user_id == user_id,
                EmailVerificationEntity.used_at.is_(None),
            )
            .values(used_at=now)
        )

        otp_code = f"{secrets.randbelow(1000000):06d}"
        link_token = secrets.token_urlsafe(32)
        token_entity = EmailVerificationEntity(
            id=f"evt_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            email=email.strip().lower(),
            otp_code=otp_code,
            link_token=link_token,
            expires_at=now + timedelta(minutes=ttl_minutes),
        )
        self.session.add(token_entity)
        await self.session.commit()
        return otp_code, link_token

    async def verify_otp(self, user_id: str, otp_code: str) -> bool:
        """Verify 6-digit OTP code for user_id and mark email_verified=True."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(EmailVerificationEntity)
            .where(
                EmailVerificationEntity.user_id == user_id,
                EmailVerificationEntity.used_at.is_(None),
            )
            .order_by(EmailVerificationEntity.created_at.desc())
        )
        token_entity = (await self.session.execute(stmt)).scalars().first()
        if not token_entity:
            return False
        if _as_utc(token_entity.expires_at) < now:
            return False
        if not secrets.compare_digest(token_entity.otp_code, otp_code.strip()):
            return False

        token_entity.used_at = now
        user_entity = await self.session.get(UserEntity, user_id)
        if not user_entity:
            return False
        user_entity.email_verified = True
        await self.session.commit()
        return True

    async def verify_link_token(self, link_token: str) -> Optional[UserRecord]:
        """Verify clickable email link token and mark user's email_verified=True."""
        now = datetime.now(timezone.utc)
        stmt = select(EmailVerificationEntity).where(
            EmailVerificationEntity.link_token == link_token.strip(),
            EmailVerificationEntity.used_at.is_(None),
        )
        token_entity = (await self.session.execute(stmt)).scalar_one_or_none()
        if not token_entity:
            return None
        if _as_utc(token_entity.expires_at) < now:
            return None

        token_entity.used_at = now
        user_entity = await self.session.get(UserEntity, token_entity.user_id)
        if not user_entity:
            return None
        user_entity.email_verified = True
        await self.session.commit()
        await self.session.refresh(user_entity)
        return _to_user_record(user_entity)
