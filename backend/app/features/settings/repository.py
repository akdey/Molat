# backend/app/features/settings/repository.py
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.settings.entity import UserSettingsEntity
from app.features.settings.models import UserSettings, UserSettingsUpdate
from app.features.reading.entity import ReadingLogEntity
from app.features.books.entity import BookEntity

IST = ZoneInfo("Asia/Kolkata")


class SettingsRepository:
    """SQLAlchemy 2.0 async repository for User Settings."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, user_id: str = "owner", force_refresh: bool = False) -> UserSettings:
        stmt = select(UserSettingsEntity).where(UserSettingsEntity.user_id == user_id)
        result = await self.session.execute(stmt)
        row = result.scalar_one_or_none()
        if row:
            daily_goal = row.daily_goal_pages or 15
            active_book = row.active_book_id
            theme = row.theme or "light"
            updated_at = row.updated_at
        else:
            daily_goal = 15
            active_book = None
            theme = "light"
            updated_at = None

        if not active_book:
            # Fallback 1: most recent reading log
            log_stmt = (
                select(ReadingLogEntity.book_id)
                .where(ReadingLogEntity.user_id == user_id)
                .order_by(ReadingLogEntity.session_date.desc(), ReadingLogEntity.created_at.desc())
                .limit(1)
            )
            log_res = await self.session.execute(log_stmt)
            active_book = log_res.scalar_one_or_none()

            # Fallback 2: first book with READING status
            if not active_book:
                book_stmt = (
                    select(BookEntity.book_id)
                    .where(BookEntity.user_id == user_id, BookEntity.reading_status == "READING")
                    .limit(1)
                )
                book_res = await self.session.execute(book_stmt)
                active_book = book_res.scalar_one_or_none()

        return UserSettings(
            user_id=user_id,
            daily_goal_pages=daily_goal,
            active_book_id=active_book,
            theme=theme,
            updated_at=updated_at,
        )

    async def update(self, updates: UserSettingsUpdate, user_id: str = "owner") -> UserSettings:
        stmt = select(UserSettingsEntity).where(UserSettingsEntity.user_id == user_id)
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        if not entity:
            entity = UserSettingsEntity(
                user_id=user_id,
                daily_goal_pages=updates.daily_goal_pages or 15,
                active_book_id=updates.active_book_id,
                theme=updates.theme or "light",
                updated_at=now_str,
            )
            self.session.add(entity)
        else:
            if updates.daily_goal_pages is not None:
                entity.daily_goal_pages = updates.daily_goal_pages
            if updates.active_book_id is not None:
                entity.active_book_id = updates.active_book_id
            if updates.theme is not None:
                entity.theme = updates.theme
            entity.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(entity)
        return UserSettings(
            user_id=user_id,
            daily_goal_pages=entity.daily_goal_pages,
            active_book_id=entity.active_book_id,
            theme=entity.theme,
            updated_at=entity.updated_at,
        )
