# backend/app/features/lending/repository.py
import uuid
import logging
from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.lending.entity import LendingEntity
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn, LendingStatus
from app.features.books.entity import BookEntity

logger = logging.getLogger("molat.lending.repo")
IST = ZoneInfo("Asia/Kolkata")


def _to_lending(e: LendingEntity, book: Optional[BookEntity] = None) -> LendingRecord:
    today = datetime.now(IST).date()
    days_lent = 0
    if e.lent_date:
        try:
            l_d = datetime.strptime(str(e.lent_date), "%Y-%m-%d").date()
            days_lent = max(0, (today - l_d).days)
        except (ValueError, TypeError) as err:
            logger.warning(f"Could not parse lent_date '{e.lent_date}': {err}")

    is_overdue = False
    if e.due_date and e.status == "ACTIVE":
        try:
            d_d = datetime.strptime(str(e.due_date), "%Y-%m-%d").date()
            is_overdue = today > d_d
        except (ValueError, TypeError) as err:
            logger.warning(f"Could not parse due_date '{e.due_date}': {err}")

    return LendingRecord(
        lending_id=str(e.lending_id),
        book_id=str(e.book_id),
        user_id=e.user_id,
        borrower_name=e.borrower_name,
        borrower_contact=e.borrower_contact,
        lent_date=e.lent_date,
        due_date=e.due_date,
        returned_date=e.returned_date,
        status=LendingStatus(e.status) if e.status else LendingStatus.ACTIVE,
        notes=e.notes,
        days_lent=days_lent,
        is_overdue=is_overdue,
        book_title=book.title if book else None,
        book_authors=book.authors if book else None,
        book_cover_url=book.cover_url if book else None,
        created_at=e.created_at or "",
    )


class LendingRepository:
    """SQLAlchemy 2.0 async repository for Book Lending management."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, status: Optional[str] = None, user_id: str = "owner", force_refresh: bool = False) -> List[LendingRecord]:
        stmt = (
            select(LendingEntity, BookEntity)
            .outerjoin(BookEntity, BookEntity.book_id == LendingEntity.book_id)
            .where(LendingEntity.user_id == user_id)
        )
        if status:
            stmt = stmt.where(LendingEntity.status == status)
        stmt = stmt.order_by(LendingEntity.lent_date.desc(), LendingEntity.created_at.desc())

        result = await self.session.execute(stmt)
        rows = result.all()
        return [_to_lending(lend_ent, book_ent) for lend_ent, book_ent in rows]

    async def get_active_for_book(self, book_id: str, user_id: str = "owner") -> Optional[LendingRecord]:
        stmt = (
            select(LendingEntity, BookEntity)
            .outerjoin(BookEntity, BookEntity.book_id == LendingEntity.book_id)
            .where(
                LendingEntity.user_id == user_id,
                LendingEntity.book_id == book_id,
                LendingEntity.status == "ACTIVE",
            )
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if row:
            return _to_lending(row[0], row[1])
        return None

    async def _generate_next_lending_id(self, user_id: str) -> str:
        return str(uuid.uuid4())

    async def create(self, payload: LendingRecordCreate, user_id: str = "owner") -> LendingRecord:
        new_id = await self._generate_next_lending_id(user_id)
        lent_date = payload.lent_date or datetime.now(IST).strftime("%Y-%m-%d")
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        entity = LendingEntity(
            lending_id=new_id,
            user_id=user_id,
            book_id=payload.book_id,
            borrower_name=payload.borrower_name,
            borrower_contact=payload.borrower_contact,
            lent_date=lent_date,
            due_date=payload.due_date,
            status=LendingStatus.ACTIVE.value,
            notes=payload.notes,
            created_at=now_str,
        )
        self.session.add(entity)

        # Update book location to lent
        book_stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == payload.book_id)
        book_res = await self.session.execute(book_stmt)
        book = book_res.scalar_one_or_none()
        if book:
            book.location = f"Lent to {payload.borrower_name}"
            book.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(entity)
        return _to_lending(entity, book)

    async def return_book(self, lending_id: str, payload: LendingRecordReturn, user_id: str = "owner") -> Optional[LendingRecord]:
        stmt = select(LendingEntity).where(LendingEntity.user_id == user_id, LendingEntity.lending_id == lending_id)
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()
        if not entity:
            return None

        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        entity.status = LendingStatus.RETURNED.value
        entity.returned_date = today_str
        if payload.notes:
            entity.notes = (entity.notes + " | " + payload.notes) if entity.notes else payload.notes

        book_stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == entity.book_id)
        book_res = await self.session.execute(book_stmt)
        book = book_res.scalar_one_or_none()
        if book:
            book.location = payload.return_location or "Home Shelf"
            book.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(entity)
        return _to_lending(entity, book)
