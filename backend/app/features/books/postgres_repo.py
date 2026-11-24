# backend/app/features/books/postgres_repo.py
from datetime import datetime
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
import asyncpg
from app.features.books.models import Book, BookCreate, BookUpdate, ReadingStatus, BookCondition
from app.features.books.repository import BookRepository

IST = ZoneInfo("Asia/Kolkata")


def _to_book(r: asyncpg.Record) -> Book:
    """Pure mapper converting asyncpg row into clean Book domain entity."""
    return Book(
        book_id=r["book_id"],
        user_id=r["user_id"],
        title=r["title"],
        subtitle=r.get("subtitle"),
        authors=r.get("authors"),
        isbn_10=r.get("isbn_10"),
        isbn_13=r.get("isbn_13"),
        publisher=r.get("publisher"),
        publication_year=r.get("publication_year"),
        language=r.get("language") or "English",
        genre=r.get("genre"),
        cover_url=r.get("cover_url"),
        reading_status=ReadingStatus(r["reading_status"]) if r.get("reading_status") else ReadingStatus.UNREAD,
        condition=BookCondition(r["condition"]) if r.get("condition") else BookCondition.GOOD,
        location=r.get("location") or "Home Shelf",
        purchase_price=float(r["purchase_price"]) if r.get("purchase_price") is not None else None,
        rp=float(r["rp"]) if r.get("rp") is not None else None,
        purchase_date=r.get("purchase_date"),
        rating=r.get("rating"),
        notes=r.get("notes"),
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )


class PostgresBookRepository(BookRepository):
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[Book]:
        query = """
            SELECT user_id, book_id, title, subtitle, authors, isbn_10, isbn_13, publisher,
                   publication_year, language, genre, cover_url, reading_status, condition,
                   location, purchase_price, rp, purchase_date, rating, notes, created_at, updated_at
            FROM books
            WHERE user_id = $1
            ORDER BY book_id ASC
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, user_id)
            return [_to_book(r) for r in rows]

    async def get(self, book_id: str, user_id: str = "owner") -> Optional[Book]:
        query = """
            SELECT user_id, book_id, title, subtitle, authors, isbn_10, isbn_13, publisher,
                   publication_year, language, genre, cover_url, reading_status, condition,
                   location, purchase_price, rp, purchase_date, rating, notes, created_at, updated_at
            FROM books
            WHERE user_id = $1 AND book_id = $2
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id, book_id)
            return _to_book(row) if row else None

    async def _generate_next_book_id(self, user_id: str) -> str:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT book_id FROM books WHERE user_id = $1", user_id)
            max_num = 0
            for r in rows:
                bid = r["book_id"]
                if bid.startswith("BOOK-"):
                    try:
                        num = int(bid.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except (IndexError, ValueError):
                        pass
            return f"BOOK-{max_num + 1:03d}"

    async def create(self, data: BookCreate, user_id: str = "owner") -> Book:
        new_id = await self._generate_next_book_id(user_id)
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        book = Book(
            book_id=new_id,
            user_id=user_id,
            created_at=today_str,
            updated_at=today_str,
            **data.model_dump(),
        )

        insert_sql = """
            INSERT INTO books (
                user_id, book_id, title, subtitle, authors, isbn_10, isbn_13,
                publisher, publication_year, language, genre, cover_url,
                reading_status, condition, location, purchase_price, rp,
                purchase_date, rating, notes, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17,
                $18, $19, $20, $21, $22
            )
        """
        async with self.pool.acquire() as conn:
            await conn.execute(
                insert_sql,
                user_id,
                book.book_id,
                book.title,
                book.subtitle,
                book.authors,
                book.isbn_10,
                book.isbn_13,
                book.publisher,
                book.publication_year,
                book.language,
                book.genre,
                book.cover_url,
                book.reading_status.value if hasattr(book.reading_status, "value") else book.reading_status,
                book.condition.value if hasattr(book.condition, "value") else book.condition,
                book.location,
                book.purchase_price,
                book.rp,
                book.purchase_date,
                book.rating,
                book.notes,
                book.created_at,
                book.updated_at,
            )
        return book

    async def update(self, book_id: str, updates: BookUpdate, user_id: str = "owner") -> Optional[Book]:
        target = await self.get(book_id, user_id=user_id)
        if not target:
            return None

        update_data = updates.model_dump(exclude_unset=True)
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        fields = []
        values = [user_id, book_id]
        idx = 3
        for k, v in update_data.items():
            val = v.value if hasattr(v, "value") else v
            fields.append(f"{k} = ${idx}")
            values.append(val)
            idx += 1
        fields.append(f"updated_at = ${idx}")
        values.append(today_str)

        sql = f"UPDATE books SET {', '.join(fields)} WHERE user_id = $1 AND book_id = $2"
        async with self.pool.acquire() as conn:
            await conn.execute(sql, *values)

        return await self.get(book_id, user_id=user_id)

    async def delete(self, book_id: str, user_id: str = "owner") -> bool:
        async with self.pool.acquire() as conn:
            res = await conn.execute("DELETE FROM books WHERE user_id = $1 AND book_id = $2", user_id, book_id)
            return "DELETE 1" in res

    async def batch_update_covers(self, items: List[Dict[str, str]], user_id: str = "owner") -> int:
        valid_items = [it for it in items if it.get("book_id") and it.get("cover_url")]
        if not valid_items:
            return 0

        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for it in valid_items:
                    await conn.execute(
                        "UPDATE books SET cover_url = $1, updated_at = $2 WHERE user_id = $3 AND book_id = $4",
                        it["cover_url"],
                        today_str,
                        user_id,
                        it["book_id"],
                    )
        return len(valid_items)
