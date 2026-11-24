# backend/app/features/settings/postgres_repo.py
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo
import asyncpg
from app.features.settings.models import UserSettings, UserSettingsUpdate
from app.features.settings.repository import SettingsRepository

IST = ZoneInfo("Asia/Kolkata")


class PostgresSettingsRepository(SettingsRepository):
    def __init__(self, pool: asyncpg.Pool, reading_repo=None, book_repo=None):
        self.pool = pool
        self.reading_repo = reading_repo
        self.book_repo = book_repo

    async def get(self, user_id: str = "owner", force_refresh: bool = False) -> UserSettings:
        query = "SELECT user_id, daily_goal_pages, active_book_id, theme, updated_at FROM user_settings WHERE user_id = $1"
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id)
            if row:
                daily_goal = row["daily_goal_pages"] or 15
                active_book = row["active_book_id"]
                theme = row["theme"] or "light"
                updated_at = row["updated_at"]
            else:
                daily_goal = 15
                active_book = None
                theme = "light"
                updated_at = None

        if not active_book:
            if self.reading_repo:
                logs = await self.reading_repo.list(user_id=user_id)
                if logs:
                    active_book = logs[0].book_id
            if not active_book and self.book_repo:
                books = await self.book_repo.list(user_id=user_id)
                current = next((b for b in books if b.reading_status.value == "READING"), None)
                if current:
                    active_book = current.book_id

        return UserSettings(
            user_id=user_id,
            daily_goal_pages=daily_goal,
            active_book_id=active_book,
            theme=theme,
            updated_at=updated_at,
        )

    async def update(self, updates: UserSettingsUpdate, user_id: str = "owner") -> UserSettings:
        current = await self.get(user_id=user_id)
        dg = updates.daily_goal_pages if updates.daily_goal_pages is not None else current.daily_goal_pages
        ab = updates.active_book_id if updates.active_book_id is not None else current.active_book_id
        th = updates.theme if updates.theme is not None else current.theme
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        upsert_sql = """
            INSERT INTO user_settings (user_id, daily_goal_pages, active_book_id, theme, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET
                daily_goal_pages = EXCLUDED.daily_goal_pages,
                active_book_id = EXCLUDED.active_book_id,
                theme = EXCLUDED.theme,
                updated_at = EXCLUDED.updated_at
        """
        async with self.pool.acquire() as conn:
            await conn.execute(upsert_sql, user_id, dg, ab, th, now_str)

        return await self.get(user_id=user_id, force_refresh=True)
