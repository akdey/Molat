# backend/app/features/settings/sheets_repo.py
import logging
import re
from datetime import datetime
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo
import httpx
from app.features.settings.models import UserSettings, UserSettingsUpdate
from app.features.settings.repository import SettingsRepository

logger = logging.getLogger("molat.settings.sheets")
IST = ZoneInfo("Asia/Kolkata")


def _sanitize(val: Any) -> Any:
    if val is None:
        return ""
    s = str(val)
    if s.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + s
    return val


def _parse_int(val: Any) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        if isinstance(val, int):
            return val
        if isinstance(val, float):
            return int(val)
        cleaned = re.sub(r"[^\d.-]", "", str(val).strip())
        if not cleaned or cleaned in ("-", ".", "-."):
            return None
        return int(float(cleaned))
    except (ValueError, TypeError):
        return None


class SheetsSettingsRepository(SettingsRepository):
    def __init__(self, bridge_url: str, bridge_token: Optional[str] = None, reading_repo=None, book_repo=None):
        self.bridge_url = bridge_url
        self.bridge_token = bridge_token
        self.reading_repo = reading_repo
        self.book_repo = book_repo
        self._cache: Dict[str, Any] = {}

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=15.0, follow_redirects=True)

    async def get(self, user_id: str = "owner", force_refresh: bool = False) -> UserSettings:
        settings_dict = dict(self._cache)
        latest_updated_at = None

        params = {"table": "Settings"}
        if self.bridge_token:
            params["token"] = self.bridge_token
        try:
            async with self._client() as client:
                resp = await client.get(self.bridge_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                rows = data.get("rows") or []
                for r in rows:
                    k, v, u = r.get("key"), r.get("value"), r.get("updated_at")
                    if k:
                        settings_dict[k] = str(v) if v is not None else ""
                        if u:
                            latest_updated_at = u
        except Exception as e:
            logger.warning(f"Failed to fetch settings from sheets bridge: {e}")

        daily_goal = _parse_int(settings_dict.get("daily_goal_pages")) or 15
        active_book = settings_dict.get("active_book_id")

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

        theme = settings_dict.get("theme", "light")
        return UserSettings(
            user_id=user_id,
            daily_goal_pages=daily_goal,
            active_book_id=active_book,
            theme=theme,
            updated_at=latest_updated_at,
        )

    async def update(self, updates: UserSettingsUpdate, user_id: str = "owner") -> UserSettings:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        changes: Dict[str, str] = {}
        if updates.daily_goal_pages is not None:
            changes["daily_goal_pages"] = str(max(1, min(500, updates.daily_goal_pages)))
        if updates.active_book_id is not None:
            changes["active_book_id"] = str(updates.active_book_id)
        if updates.theme is not None:
            changes["theme"] = "dark" if updates.theme == "dark" else "light"

        self._cache.update(changes)

        if changes:
            async with self._client() as client:
                for k, v in changes.items():
                    record = {"key": k, "value": _sanitize(v), "updated_at": now_str}
                    payload = {
                        "token": self.bridge_token or "",
                        "action": "update",
                        "table": "Settings",
                        "keyField": "key",
                        "keyValue": k,
                        "record": record,
                    }
                    resp = await client.post(self.bridge_url, json=payload)
                    data = resp.json()
                    if not data.get("success"):
                        # Append if not exists
                        await client.post(self.bridge_url, json={
                            "token": self.bridge_token or "",
                            "action": "append",
                            "table": "Settings",
                            "record": record,
                        })

        return await self.get(user_id=user_id, force_refresh=True)
