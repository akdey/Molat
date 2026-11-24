# backend/app/features/reading/postgres_repo.py
from datetime import datetime
from typing import List, Optional, Any
from zoneinfo import ZoneInfo
import asyncpg
from app.features.reading.models import ReadingLog, ReadingLogCreate
from app.features.reading.repository import ReadingRepository

IST = ZoneInfo("Asia/Kolkata")


def _to_reading_log(r: asyncpg.Record) -> ReadingLog:
    return ReadingLog(
        log_id=r["log_id"],
        book_id=r["book_id"],
        user_id=r["user_id"],
        session_date=r["session_date"],
        start_page=r.get("start_page") or 0,
        end_page=r.get("end_page") or 0,
        pages_read=r["pages_read"],
        duration_minutes=r.get("duration_minutes") or 0,
        session_note=r.get("session_note"),
        created_at=r.get("created_at") or "",
    )


class PostgresReadingRepository(ReadingRepository):
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[ReadingLog]:
        query = """
            SELECT user_id, log_id, book_id, session_date, start_page, end_page,
                   pages_read, duration_minutes, session_note, created_at
            FROM reading_logs
            WHERE user_id = $1
            ORDER BY session_date DESC, created_at DESC
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, user_id)
            return [_to_reading_log(r) for r in rows]

    async def _generate_next_log_id(self, user_id: str) -> str:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT log_id FROM reading_logs WHERE user_id = $1", user_id)
            max_num = 0
            for r in rows:
                lid = r["log_id"]
                if lid.startswith("LOG-"):
                    try:
                        num = int(lid.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except (IndexError, ValueError):
                        pass
            return f"LOG-{max_num + 1:03d}"

    async def create(self, data: ReadingLogCreate, user_id: str = "owner") -> ReadingLog:
        new_log_id = await self._generate_next_log_id(user_id)
        clean_date = data.session_date or datetime.now(IST).strftime("%Y-%m-%d")
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        log = ReadingLog(
            log_id=new_log_id,
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

        async with self.pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO reading_logs (
                        user_id, log_id, book_id, session_date, start_page,
                        end_page, pages_read, duration_minutes, session_note, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """,
                    user_id,
                    log.log_id,
                    log.book_id,
                    log.session_date,
                    log.start_page,
                    log.end_page,
                    log.pages_read,
                    log.duration_minutes,
                    log.session_note,
                    log.created_at,
                )

                # Auto-transition target book
                if data.finished_book:
                    if data.rating is not None:
                        await conn.execute(
                            "UPDATE books SET reading_status = 'COMPLETED', rating = $1, updated_at = $2 WHERE user_id = $3 AND book_id = $4",
                            data.rating,
                            today_str,
                            user_id,
                            data.book_id,
                        )
                    else:
                        await conn.execute(
                            "UPDATE books SET reading_status = 'COMPLETED', updated_at = $1 WHERE user_id = $2 AND book_id = $3",
                            today_str,
                            user_id,
                            data.book_id,
                        )
                else:
                    await conn.execute(
                        "UPDATE books SET reading_status = 'READING', updated_at = $1 WHERE user_id = $2 AND book_id = $3 AND reading_status = 'UNREAD'",
                        today_str,
                        user_id,
                        data.book_id,
                    )

        return log
