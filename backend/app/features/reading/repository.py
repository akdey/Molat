# backend/app/features/reading/repository.py
import uuid
from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.reading.entity import ReadingLogEntity
from app.features.reading.models import ReadingLog, ReadingLogCreate
from app.features.books.entity import BookEntity
from app.features.alcoves.entity import AlcoveMemberEntity, UserBookStateEntity

IST = ZoneInfo("Asia/Kolkata")


def _to_reading_log(e: ReadingLogEntity) -> ReadingLog:
    return ReadingLog(
        log_id=str(e.log_id),
        book_id=str(e.book_id) if e.book_id else None,
        book_title=e.book_title,
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
    """SQLAlchemy 2.0 async repository for Reading Logs (supports personal & Alcove shared books)."""

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
        return str(uuid.uuid4())

    async def create(self, data: ReadingLogCreate, user_id: str = "owner") -> ReadingLog:
        new_log_id = await self._generate_next_log_id(user_id)
        clean_date = data.session_date or datetime.now(IST).strftime("%Y-%m-%d")
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        # Look up the book (either owned by user_id or shared in an Alcove user_id belongs to)
        book = (
            await self.session.execute(select(BookEntity).where(BookEntity.book_id == data.book_id))
        ).scalar_one_or_none()

        is_owner = bool(book and book.user_id == user_id)
        is_alcove_member = False
        if book and not is_owner and book.alcove_id:
            membership = (
                await self.session.execute(
                    select(AlcoveMemberEntity).where(
                        AlcoveMemberEntity.alcove_id == book.alcove_id,
                        AlcoveMemberEntity.user_id == user_id,
                    )
                )
            ).scalar_one_or_none()
            is_alcove_member = membership is not None

        entity = ReadingLogEntity(
            log_id=new_log_id,
            user_id=user_id,
            book_id=data.book_id,
            book_title=book.title if book else None,
            session_date=clean_date,
            start_page=data.start_page,
            end_page=data.end_page,
            pages_read=data.pages_read if data.pages_read is not None else (data.end_page - data.start_page + 1),
            duration_minutes=data.duration_minutes or 0,
            session_note=data.session_note,
            created_at=now_str,
        )
        self.session.add(entity)

        if book and is_owner:
            if data.finished_book:
                book.reading_status = "COMPLETED"
                if data.rating is not None:
                    book.rating = data.rating
            elif book.reading_status == "UNREAD":
                book.reading_status = "READING"
            book.updated_at = now_str
        elif book and is_alcove_member:
            # Keep owner's book untouched; update THIS reader's personal UserBookStateEntity
            state = (
                await self.session.execute(
                    select(UserBookStateEntity).where(
                        UserBookStateEntity.user_id == user_id,
                        UserBookStateEntity.book_id == book.book_id,
                    )
                )
            ).scalar_one_or_none()
            if not state:
                state = UserBookStateEntity(
                    id=f"ubs_{uuid.uuid4().hex[:12]}",
                    user_id=user_id,
                    book_id=book.book_id,
                    reading_status="UNREAD",
                    current_page=0,
                )
                self.session.add(state)

            state.current_page = max(state.current_page or 0, data.end_page)
            if data.finished_book:
                state.reading_status = "COMPLETED"
                if data.rating is not None:
                    state.rating = data.rating
            elif state.reading_status == "UNREAD":
                state.reading_status = "READING"
            state.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(entity)
        return _to_reading_log(entity)
