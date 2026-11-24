# backend/app/features/settings/memory_repo.py
from collections import defaultdict
from datetime import datetime
from typing import Dict, Any
from zoneinfo import ZoneInfo
from app.features.settings.models import UserSettings, UserSettingsUpdate
from app.features.settings.repository import SettingsRepository

IST = ZoneInfo("Asia/Kolkata")


class MemorySettingsRepository(SettingsRepository):
    def __init__(self, reading_repo=None, book_repo=None):
        self._store: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {"daily_goal_pages": 15, "active_book_id": None, "theme": "light", "updated_at": None}
        )
        self.reading_repo = reading_repo
        self.book_repo = book_repo

    async def get(self, user_id: str = "owner", force_refresh: bool = False) -> UserSettings:
        d = dict(self._store[user_id])
        active_book = d.get("active_book_id")

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
            daily_goal_pages=d.get("daily_goal_pages", 15),
            active_book_id=active_book,
            theme=d.get("theme", "light"),
            updated_at=d.get("updated_at"),
        )

    async def update(self, updates: UserSettingsUpdate, user_id: str = "owner") -> UserSettings:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        if updates.daily_goal_pages is not None:
            self._store[user_id]["daily_goal_pages"] = max(1, min(500, updates.daily_goal_pages))
        if updates.active_book_id is not None:
            self._store[user_id]["active_book_id"] = updates.active_book_id
        if updates.theme is not None:
            self._store[user_id]["theme"] = "dark" if updates.theme == "dark" else "light"
        self._store[user_id]["updated_at"] = now_str

        return await self.get(user_id=user_id, force_refresh=True)
