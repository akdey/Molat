# backend/app/features/reading/repository.py
from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.reading.entity import ReadingLogEntity
from app.features.reading.models import ReadingLog, ReadingLogCreate
from app.features.books.entity import BookEntity

IST = ZoneInfo("Asia/Kolkata")


def _to_reading_log(e: ReadingLogEntity) -> ReadingLog:
    return ReadingLog(
        log_id=e.log_id,
        book_id=e.book_id,
        user_id=e.user_id,
        session_date=e.session_date,
        start_page=e.start_page or 0,
        end_page=e.end_page or 0,
        pages_read=e.pages_read,
        duration_minutes=e.duration_minutes or 0,
        session_note=e.session_note,
        created_at=e.created_at or "",
    )


class ReadingRepository:
    """SQLAlchemy 2.0 async repository for Reading Logs."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[ReadingLog]:
        stmt = (
            select(ReadingLogEntity)
            .where(ReadingLogEntity.user_id == user_id)
            .order_by(ReadingLogEntity.session_date.desc(), ReadingLogEntity.created_at.desc())
        )
        result = await self.session.execute(stmt)
        entities = result.scalars().all()
        return [_to_reading_log(e) for e in entities]

    async def _generate_next_log_id(self, user_id: str) -> str:
        stmt = select(ReadingLogEntity.log_id).where(ReadingLogEntity.user_id == user_id)
        result = await self.session.execute(stmt)
        log_ids = result.scalars().all()
        max_num = 0
        for lid in log_ids:
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
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        entity = ReadingLogEntity(
            log_id=new_log_id,
            user_id=user_id,
            book_id=data.book_id,
            session_date=clean_date,
            start_page=data.start_page,
            end_page=data.end_page,
            pages_read=data.pages_read if data.pages_read is not None else (data.end_page - data.start_page + 1),
            duration_minutes=data.duration_minutes or 0,
            session_note=data.session_note,
            created_at=now_str,
        )
        self.session.add(entity)

        # Update book status if finished or reading
        book_stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == data.book_id)
        book_res = await self.session.execute(book_stmt)
        book = book_res.scalar_one_or_none()
        if book:
            if data.finished_book:
                book.reading_status = "COMPLETED"
                if data.rating is not None:
                    book.rating = data.rating
            elif book.reading_status == "UNREAD":
                book.reading_status = "READING"
            book.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(entity)
        return _to_reading_log(entity)

    async def delete(self, log_id: str, user_id: str = "owner") -> bool:
        stmt = delete(ReadingLogEntity).where(ReadingLogEntity.user_id == user_id, ReadingLogEntity.log_id == log_id)
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0
