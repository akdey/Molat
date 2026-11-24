# backend/app/features/wishlist/memory_repo.py
from collections import defaultdict
from datetime import datetime
from typing import List, Optional, Dict
from zoneinfo import ZoneInfo
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.features.wishlist.repository import WishlistRepository
from app.features.books.models import Book, BookCondition, ReadingStatus

IST = ZoneInfo("Asia/Kolkata")


class MemoryWishlistRepository(WishlistRepository):
    def __init__(self, book_repo=None):
        self._store: Dict[str, List[WishlistItem]] = defaultdict(list)
        self.book_repo = book_repo

    def _generate_next_wishlist_id(self, user_id: str) -> str:
        max_num = 0
        for w in self._store[user_id]:
            if w.wishlist_id.startswith("WISH-"):
                try:
                    num = int(w.wishlist_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"WISH-{max_num + 1:03d}"

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[WishlistItem]:
        return list(self._store[user_id])

    async def create(self, data: WishlistItemCreate, user_id: str = "owner") -> WishlistItem:
        new_id = self._generate_next_wishlist_id(user_id)
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        item = WishlistItem(
            wishlist_id=new_id,
            user_id=user_id,
            created_at=today_str,
            **data.model_dump(),
        )
        self._store[user_id].insert(0, item)
        return item

    async def acquire(self, wishlist_id: str, acquire_data: WishlistAcquireRequest, user_id: str = "owner") -> Optional[Book]:
        target = next((w for w in self._store[user_id] if w.wishlist_id == wishlist_id), None)
        if not target:
            return None

        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        price = acquire_data.purchase_price if acquire_data.purchase_price is not None else target.target_price

        # Next book ID
        next_book_id = "BOOK-001"
        if self.book_repo and hasattr(self.book_repo, "_store"):
            max_num = 0
            for b in self.book_repo._store[user_id]:
                if b.book_id.startswith("BOOK-"):
                    try:
                        num = int(b.book_id.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except (IndexError, ValueError):
                        pass
            next_book_id = f"BOOK-{max_num + 1:03d}"

        new_book = Book(
            book_id=next_book_id,
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

        # 1. Add to books
        if self.book_repo and hasattr(self.book_repo, "_store"):
            self.book_repo._store[user_id].insert(0, new_book)

        # 2. Delete from wishlist
        self._store[user_id] = [w for w in self._store[user_id] if w.wishlist_id != wishlist_id]

        return new_book
