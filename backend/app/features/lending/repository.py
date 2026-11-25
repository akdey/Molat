# backend/app/features/lending/repository.py
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
        lending_id=e.lending_id,
        book_id=e.book_id,
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
            .outerjoin(BookEntity, (BookEntity.user_id == LendingEntity.user_id) & (BookEntity.book_id == LendingEntity.book_id))
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
            .outerjoin(BookEntity, (BookEntity.user_id == LendingEntity.user_id) & (BookEntity.book_id == LendingEntity.book_id))
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
        stmt = select(LendingEntity.lending_id).where(LendingEntity.user_id == user_id)
        result = await self.session.execute(stmt)
        lending_ids = result.scalars().all()
        max_num = 0
        for lid in lending_ids:
            if lid.startswith("LEND-"):
                try:
                    num = int(lid.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"LEND-{max_num + 1:03d}"

    async def create(self, data: LendingRecordCreate, user_id: str = "owner") -> LendingRecord:
        new_id = await self._generate_next_lending_id(user_id)
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        clean_lent_date = data.lent_date or datetime.now(IST).strftime("%Y-%m-%d")

        entity = LendingEntity(
            lending_id=new_id,
            user_id=user_id,
            book_id=data.book_id,
            borrower_name=data.borrower_name,
            borrower_contact=data.borrower_contact,
            lent_date=clean_lent_date,
            due_date=data.due_date,
            returned_date=None,
            status="ACTIVE",
            notes=data.notes,
            created_at=now_str,
        )
        self.session.add(entity)

        # Update book location to Lent
        book_stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == data.book_id)
        book_res = await self.session.execute(book_stmt)
        book = book_res.scalar_one_or_none()
        if book:
            book.location = f"Lent to {data.borrower_name}"
            book.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(entity)
        return _to_lending(entity, book)

    async def return_book(self, lending_id: str, return_data: LendingRecordReturn, user_id: str = "owner") -> Optional[LendingRecord]:
        stmt = select(LendingEntity).where(LendingEntity.user_id == user_id, LendingEntity.lending_id == lending_id)
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()
        if not entity:
            return None

        now_date = datetime.now(IST).strftime("%Y-%m-%d")
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")

        entity.status = "RETURNED"
        entity.returned_date = now_date
        if return_data.notes:
            entity.notes = f"{entity.notes}\n{return_data.notes}".strip() if entity.notes else return_data.notes

        # Restore book location
        book_stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == entity.book_id)
        book_res = await self.session.execute(book_stmt)
        book = book_res.scalar_one_or_none()
        if book:
            book.location = return_data.return_location or "Home Shelf"
            book.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(entity)
        return _to_lending(entity, book)

    async def delete(self, lending_id: str, user_id: str = "owner") -> bool:
        stmt = delete(LendingEntity).where(LendingEntity.user_id == user_id, LendingEntity.lending_id == lending_id)
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0
