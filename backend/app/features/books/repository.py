# backend/app/features/books/repository.py
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from zoneinfo import ZoneInfo
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.books.entity import BookEntity
from app.features.genres.entity import GenreEntity, BookGenreEntity
from app.features.books.models import Book, BookCreate, BookUpdate, ReadingStatus, BookCondition

IST = ZoneInfo("Asia/Kolkata")


def _to_book(e: BookEntity) -> Book:
    genre_names: list[str] = []
    if hasattr(e, "genres") and e.genres:
        genre_names = [g.name for g in e.genres]
    genre_str = ", ".join(genre_names) if genre_names else None

    return Book(
        book_id=str(e.book_id),
        user_id=e.user_id,
        title=e.title,
        subtitle=e.subtitle,
        authors=e.authors,
        isbn_10=e.isbn_10,
        isbn_13=e.isbn_13,
        publisher=e.publisher,
        publication_year=e.publication_year,
        language=e.language or "English",
        genre=genre_str,
        genres=genre_names,
        categories=genre_names,
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
    """SQLAlchemy 2.0 async repository for Book management with 3NF normalized genres."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[Book]:
        stmt = select(BookEntity).where(BookEntity.user_id == user_id).order_by(BookEntity.title.asc())
        result = await self.session.execute(stmt)
        entities = result.scalars().all()
        return [_to_book(e) for e in entities]

    async def get(self, book_id: str, user_id: str = "owner") -> Optional[Book]:
        stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == book_id)
        result = await self.session.execute(stmt)
        e = result.scalar_one_or_none()
        return _to_book(e) if e else None

    async def _generate_next_book_id(self, user_id: str) -> str:
        return str(uuid.uuid4())

    async def _sync_genres(self, book_id: str, genre_input: Any) -> None:
        if not genre_input:
            return
        if isinstance(genre_input, str):
            genre_names = [g.strip() for g in genre_input.split(",") if g.strip()]
        elif isinstance(genre_input, (list, set, tuple)):
            genre_names = [str(g).strip() for g in genre_input if str(g).strip()]
        else:
            return

        # Fetch existing junction links for this book
        existing_stmt = select(BookGenreEntity).where(BookGenreEntity.book_id == book_id)
        existing_links = (await self.session.execute(existing_stmt)).scalars().all()
        existing_genre_ids = {link.genre_id for link in existing_links}

        target_genre_ids = set()
        for gname in genre_names:
            stmt = select(GenreEntity).where(GenreEntity.name == gname)
            res = await self.session.execute(stmt)
            genre = res.scalar_one_or_none()
            if not genre:
                genre = GenreEntity(id=str(uuid.uuid4()), name=gname)
                self.session.add(genre)
                await self.session.flush()
            target_genre_ids.add(genre.id)

        # Remove stale links
        for link in existing_links:
            if link.genre_id not in target_genre_ids:
                await self.session.delete(link)

        # Add new links
        for gid in target_genre_ids:
            if gid not in existing_genre_ids:
                self.session.add(BookGenreEntity(book_id=book_id, genre_id=gid))

    async def create(self, book: BookCreate, user_id: str = "owner") -> Book:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        new_id = await self._generate_next_book_id(user_id)

        # 3NF Schema: genre column is removed from books table
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
        genre_payload = book.genres if (hasattr(book, "genres") and book.genres) else book.genre
        await self._sync_genres(new_id, genre_payload)
        await self.session.commit()
        return await self.get(new_id, user_id=user_id) or _to_book(entity)

    async def update(self, book_id: str, updates: BookUpdate, user_id: str = "owner") -> Optional[Book]:
        stmt = select(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == book_id)
        result = await self.session.execute(stmt)
        entity = result.scalar_one_or_none()
        if not entity:
            return None

        update_data = updates.model_dump(exclude_unset=True)
        if "reading_status" in update_data and update_data["reading_status"] is not None:
            val = update_data["reading_status"]
            update_data["reading_status"] = val.value if hasattr(val, "value") else str(val)
        if "condition" in update_data and update_data["condition"] is not None:
            val = update_data["condition"]
            update_data["condition"] = val.value if hasattr(val, "value") else str(val)

        # Extract genre updates before writing to BookEntity
        genre_val = update_data.pop("genres", None) or update_data.pop("genre", None)
        update_data.pop("categories", None)

        for field, value in update_data.items():
            setattr(entity, field, value)

        if genre_val is not None:
            await self._sync_genres(book_id, genre_val)

        entity.updated_at = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        await self.session.commit()
        return await self.get(book_id, user_id=user_id)

    async def delete(self, book_id: str, user_id: str = "owner") -> bool:
        stmt = delete(BookEntity).where(BookEntity.user_id == user_id, BookEntity.book_id == book_id)
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0

    async def batch_update_covers(self, updates: Any, user_id: str = "owner") -> int:
        count = 0
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        items = []
        if isinstance(updates, dict):
            items = list(updates.items())
        elif isinstance(updates, list):
            for item in updates:
                if isinstance(item, dict) and "book_id" in item and "cover_url" in item:
                    items.append((item["book_id"], item["cover_url"]))

        for bid, url in items:
            stmt = (
                update(BookEntity)
                .where(BookEntity.user_id == user_id, BookEntity.book_id == bid)
                .values(cover_url=url, updated_at=now_str)
            )
            res = await self.session.execute(stmt)
            count += res.rowcount
        await self.session.commit()
        return count
