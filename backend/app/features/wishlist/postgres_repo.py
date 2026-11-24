# backend/app/features/wishlist/postgres_repo.py
from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo
import asyncpg
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.features.wishlist.repository import WishlistRepository
from app.features.books.models import Book, BookCondition, ReadingStatus

IST = ZoneInfo("Asia/Kolkata")


def _to_wishlist(r: asyncpg.Record) -> WishlistItem:
    return WishlistItem(
        wishlist_id=r["wishlist_id"],
        user_id=r["user_id"],
        title=r["title"],
        authors=r.get("authors"),
        isbn_13=r.get("isbn_13"),
        genre=r.get("genre"),
        expected_rp=float(r["expected_rp"]) if r.get("expected_rp") is not None else None,
        target_price=float(r["target_price"]) if r.get("target_price") is not None else None,
        priority=r.get("priority") or "MEDIUM",
        notes=r.get("notes"),
        created_at=r.get("created_at") or "",
    )


class PostgresWishlistRepository(WishlistRepository):
    def __init__(self, pool: asyncpg.Pool, book_repo=None):
        self.pool = pool
        self.book_repo = book_repo

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[WishlistItem]:
        query = """
            SELECT user_id, wishlist_id, title, authors, isbn_13, genre,
                   expected_rp, target_price, priority, notes, created_at
            FROM wishlist
            WHERE user_id = $1
            ORDER BY wishlist_id ASC
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, user_id)
            return [_to_wishlist(r) for r in rows]

    async def _generate_next_wishlist_id(self, user_id: str) -> str:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT wishlist_id FROM wishlist WHERE user_id = $1", user_id)
            max_num = 0
            for r in rows:
                wid = r["wishlist_id"]
                if wid.startswith("WISH-"):
                    try:
                        num = int(wid.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except (IndexError, ValueError):
                        pass
            return f"WISH-{max_num + 1:03d}"

    async def create(self, data: WishlistItemCreate, user_id: str = "owner") -> WishlistItem:
        new_id = await self._generate_next_wishlist_id(user_id)
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        item = WishlistItem(
            wishlist_id=new_id,
            user_id=user_id,
            created_at=today_str,
            **data.model_dump(),
        )

        sql = """
            INSERT INTO wishlist (
                user_id, wishlist_id, title, authors, isbn_13, genre,
                expected_rp, target_price, priority, notes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        """
        async with self.pool.acquire() as conn:
            await conn.execute(
                sql,
                user_id,
                item.wishlist_id,
                item.title,
                item.authors,
                item.isbn_13,
                item.genre,
                item.expected_rp,
                item.target_price,
                item.priority,
                item.notes,
                item.created_at,
            )
        return item

    async def acquire(self, wishlist_id: str, acquire_data: WishlistAcquireRequest, user_id: str = "owner") -> Optional[Book]:
        items = await self.list(user_id=user_id)
        target = next((w for w in items if w.wishlist_id == wishlist_id), None)
        if not target:
            return None

        # Generate next book_id
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
            new_book_id = f"BOOK-{max_num + 1:03d}"

            today_str = datetime.now(IST).strftime("%Y-%m-%d")
            price = acquire_data.purchase_price if acquire_data.purchase_price is not None else target.target_price

            book = Book(
                book_id=new_book_id,
                user_id=user_id,
                title=target.title,
                authors=target.authors,
                isbn_13=target.isbn_13,
                genre=target.genre,
                reading_status=ReadingStatus.UNREAD,
                condition=acquire_data.condition or BookCondition.GOOD,
                location=acquire_data.location or "Home Shelf",
                purchase_price=price,
                rp=target.expected_rp,
                purchase_date=today_str,
                notes=target.notes,
                created_at=today_str,
                updated_at=today_str,
            )

            async with conn.transaction():
                # 1. Insert into books
                await conn.execute(
                    """
                    INSERT INTO books (
                        user_id, book_id, title, authors, isbn_13, genre,
                        reading_status, condition, location, purchase_price,
                        rp, purchase_date, notes, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    """,
                    user_id,
                    book.book_id,
                    book.title,
                    book.authors,
                    book.isbn_13,
                    book.genre,
                    book.reading_status.value,
                    book.condition.value,
                    book.location,
                    book.purchase_price,
                    book.rp,
                    book.purchase_date,
                    book.notes,
                    book.created_at,
                    book.updated_at,
                )
                # 2. Delete from wishlist
                await conn.execute(
                    "DELETE FROM wishlist WHERE user_id = $1 AND wishlist_id = $2",
                    user_id,
                    wishlist_id,
                )

        return book
