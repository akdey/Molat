# backend/app/features/reading/memory_repo.py
from collections import defaultdict
from datetime import datetime
from typing import List, Optional, Dict
from zoneinfo import ZoneInfo
from app.features.reading.models import ReadingLog, ReadingLogCreate
from app.features.reading.repository import ReadingRepository
from app.features.books.models import ReadingStatus

IST = ZoneInfo("Asia/Kolkata")


class MemoryReadingRepository(ReadingRepository):
    def __init__(self, book_repo=None):
        self._store: Dict[str, List[ReadingLog]] = defaultdict(list)
        self.book_repo = book_repo

    def _generate_next_log_id(self, user_id: str) -> str:
        max_num = 0
        for l in self._store[user_id]:
            if l.log_id.startswith("LOG-"):
                try:
                    num = int(l.log_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"LOG-{max_num + 1:03d}"

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[ReadingLog]:
        return list(self._store[user_id])

    async def create(self, data: ReadingLogCreate, user_id: str = "owner") -> ReadingLog:
        new_id = self._generate_next_log_id(user_id)
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
        self._store[user_id].insert(0, log)

        # Auto-transition book in memory book repo if attached
        if self.book_repo and hasattr(self.book_repo, "_store"):
            for idx, b in enumerate(self.book_repo._store[user_id]):
                if b.book_id == data.book_id:
                    if data.finished_book:
                        self.book_repo._store[user_id][idx] = b.model_copy(
                            update={
                                "reading_status": ReadingStatus.COMPLETED,
                                "rating": data.rating if data.rating is not None else b.rating,
                                "updated_at": today_str,
                            }
                        )
                    elif b.reading_status == ReadingStatus.UNREAD:
                        self.book_repo._store[user_id][idx] = b.model_copy(
                            update={
                                "reading_status": ReadingStatus.READING,
                                "updated_at": today_str,
                            }
                        )
                    break

        return log
