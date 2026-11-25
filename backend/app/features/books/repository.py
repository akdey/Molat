# backend/app/features/books/repository.py
from datetime import datetime
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.books.entity import BookEntity
from app.features.books.models import Book, BookCreate, BookUpdate, ReadingStatus, BookCondition

IST = ZoneInfo("Asia/Kolkata")


def _to_book(e: BookEntity) -> Book:
    return Book(
        book_id=e.book_id,
        user_id=e.user_id,
        title=e.title,
        subtitle=e.subtitle,
        authors=e.authors,
        isbn_10=e.isbn_10,
        isbn_13=e.isbn_13,
        publisher=e.publisher,
        publication_year=e.publication_year,
        language=e.language or "English",
        genre=e.genre,
        cover_url=e.cover_url,
        reading_status=ReadingStatus(e.reading_status) if e.reading_status else ReadingStatus.UNREAD,
        condition=BookCondition(e.condition) if e.condition else BookCondition.GOOD,
        location=e.location or "Home Shelf",
        purchase_price=float(e.purchase_price) if e.purchase_price is not None else None,
        rp=float(e.rp) if e.rp is not None else None,
        purchase_date=e.purchase_date,
        rating=e.rating,
        notes=e.notes,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


class BookRepository:
    """SQLAlchemy 2.0 async repository for Book management."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[Book]:
        stmt = select(BookEntity).where(BookEntity.user_id == user_id).order_by(BookEntity.book_id.asc())
        result = await self.session.execute(stmt)
        entities = result.scalars().all()
        return [_to_book(e) for e in entities]

    async def get(self, book_id: str, user_id: str = "owner") -> Optional[Book]:
        stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == book_id)
        result = await self.session.execute(stmt)
        e = result.scalar_one_or_none()
        return _to_book(e) if e else None

    async def _generate_next_book_id(self, user_id: str) -> str:
        stmt = select(BookEntity.book_id).where(BookEntity.user_id == user_id)
        result = await self.session.execute(stmt)
        book_ids = result.scalars().all()
        max_num = 0
        for bid in book_ids:
            if bid.startswith("BOOK-"):
                try:
                    num = int(bid.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"BOOK-{max_num + 1:03d}"

    async def create(self, book: BookCreate, user_id: str = "owner") -> Book:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        new_id = await self._generate_next_book_id(user_id)

        entity = BookEntity(
            user_id=user_id,
            book_id=new_id,
            title=book.title,
            subtitle=book.subtitle,
            authors=book.authors,
            isbn_10=book.isbn_10,
            isbn_13=book.isbn_13,
            publisher=book.publisher,
            publication_year=book.publication_year,
            language=book.language or "English",
            genre=book.genre,
            cover_url=book.cover_url,
            reading_status=book.reading_status.value if hasattr(book.reading_status, "value") else str(book.reading_status),
            condition=book.condition.value if hasattr(book.condition, "value") else str(book.condition),
            location=book.location or "Home Shelf",
            purchase_price=book.purchase_price,
            rp=book.rp,
            purchase_date=book.purchase_date,
            rating=book.rating,
            notes=book.notes,
            created_at=now_str,
            updated_at=now_str,
        )
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return _to_book(entity)

    async def update(self, book_id: str, updates: BookUpdate, user_id: str = "owner") -> Optional[Book]:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        update_dict = updates.model_dump(exclude_unset=True)
        if not update_dict:
            return await self.get(book_id, user_id=user_id)

        # Convert enums to strings
        if "reading_status" in update_dict and update_dict["reading_status"]:
            v = update_dict["reading_status"]
            update_dict["reading_status"] = v.value if hasattr(v, "value") else str(v)
        if "condition" in update_dict and update_dict["condition"]:
            v = update_dict["condition"]
            update_dict["condition"] = v.value if hasattr(v, "value") else str(v)
        update_dict["updated_at"] = now_str

        stmt = (
            update(BookEntity)
            .where(BookEntity.user_id == user_id, BookEntity.book_id == book_id)
            .values(**update_dict)
        )
        res = await self.session.execute(stmt)
        if res.rowcount == 0:
            return None
        await self.session.commit()
        return await self.get(book_id, user_id=user_id)

    async def delete(self, book_id: str, user_id: str = "owner") -> bool:
        stmt = delete(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == book_id)
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0

    async def batch_update_covers(self, updates: List[Dict[str, str]], user_id: str = "owner") -> int:
        if not updates:
            return 0
        count = 0
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        for item in updates:
            bid = item.get("book_id")
            cover = item.get("cover_url")
            if bid and cover:
                stmt = (
                    update(BookEntity)
                    .where(BookEntity.user_id == user_id, BookEntity.book_id == bid)
                    .values(cover_url=cover, updated_at=now_str)
                )
                res = await self.session.execute(stmt)
                if res.rowcount > 0:
                    count += 1
        await self.session.commit()
        return count
