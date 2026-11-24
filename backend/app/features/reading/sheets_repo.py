# backend/app/features/reading/sheets_repo.py
import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
import httpx
from app.features.reading.models import ReadingLog, ReadingLogCreate, READING_LOGS_COLUMNS
from app.features.reading.repository import ReadingRepository
from app.features.books.models import BOOKS_SCHEMA_COLUMNS, ReadingStatus

logger = logging.getLogger("molat.reading.sheets")
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


def _from_sheet_row(r: Dict[str, Any], user_id: str = "owner") -> ReadingLog:
    start = _parse_int(r.get("start_page")) or 0
    end = _parse_int(r.get("end_page")) or 0
    raw_pages = r.get("pages_read")
    calc_pages = (end - start + 1) if (end >= start and start >= 1) else max(0, end - start)
    pages = _parse_int(raw_pages) if raw_pages not in (None, "") else calc_pages

    return ReadingLog(
        log_id=str(r.get("log_id") or ""),
        book_id=str(r.get("book_id") or ""),
        user_id=user_id,
        session_date=str(r.get("session_date") or ""),
        start_page=start,
        end_page=end,
        pages_read=pages if pages is not None else 0,
        duration_minutes=_parse_int(r.get("duration_minutes")) or 0,
        session_note=r.get("session_note") or None,
        created_at=str(r.get("created_at") or ""),
    )


class SheetsReadingRepository(ReadingRepository):
    def __init__(self, bridge_url: str, bridge_token: Optional[str] = None, book_repo=None):
        self.bridge_url = bridge_url
        self.bridge_token = bridge_token
        self.book_repo = book_repo

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=15.0, follow_redirects=True)

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[ReadingLog]:
        params = {"table": "Reading_Logs"}
        if self.bridge_token:
            params["token"] = self.bridge_token
        try:
            async with self._client() as client:
                resp = await client.get(self.bridge_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                raw_rows = data.get("rows") or []
                logs = []
                for idx, r in enumerate(raw_rows, start=1):
                    if not r.get("log_id"):
                        r["log_id"] = f"LOG-{idx:03d}"
                    if r.get("book_id"):
                        try:
                            logs.append(_from_sheet_row(r, user_id=user_id))
                        except Exception as e:
                            logger.warning(f"Error parsing sheet reading log: {e}")
                return logs
        except Exception as e:
            logger.error(f"Failed to fetch reading logs from sheets: {e}", exc_info=True)
            return []

    async def create(self, data: ReadingLogCreate, user_id: str = "owner") -> ReadingLog:
        existing = await self.list(user_id=user_id)
        max_num = 0
        for l in existing:
            if l.log_id.startswith("LOG-"):
                try:
                    num = int(l.log_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        new_id = f"LOG-{max_num + 1:03d}"
        clean_date = data.session_date or datetime.now(IST).strftime("%Y-%m-%d")
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        log = ReadingLog(
            log_id=new_id,
            book_id=data.book_id,
            user_id=user_id,
            session_date=clean_date,
            start_page=data.start_page or 0,
            end_page=data.end_page or 0,
            pages_read=data.pages_read or 0,
            duration_minutes=data.duration_minutes or 0,
            session_note=data.session_note,
            created_at=today_str,
        )

        sheet_row = [
            log.log_id,
            log.book_id,
            log.session_date,
            log.start_page,
            log.end_page,
            log.pages_read,
            log.duration_minutes,
            log.session_note or "",
            log.created_at,
        ]

        payload = {
            "token": self.bridge_token or "",
            "action": "append",
            "table": "Reading_Logs",
            "record": dict(zip(READING_LOGS_COLUMNS, [_sanitize(v) for v in sheet_row])),
        }
        async with self._client() as client:
            resp = await client.post(self.bridge_url, json=payload)
            resp.raise_for_status()

        # Auto-transition target book in sheet if book_repo present
        if self.book_repo:
            target_book = await self.book_repo.get(data.book_id, user_id=user_id)
            if target_book:
                if data.finished_book:
                    await self.book_repo.update(
                        data.book_id,
                        updates={"reading_status": ReadingStatus.COMPLETED, "rating": data.rating},
                        user_id=user_id,
                    )
                elif target_book.reading_status == ReadingStatus.UNREAD:
                    await self.book_repo.update(
                        data.book_id,
                        updates={"reading_status": ReadingStatus.READING},
                        user_id=user_id,
                    )

        return log
