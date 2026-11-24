# backend/app/features/books/memory_repo.py
from collections import defaultdict
from datetime import datetime
from typing import List, Optional, Dict
from zoneinfo import ZoneInfo
from app.features.books.models import Book, BookCreate, BookUpdate
from app.features.books.repository import BookRepository

IST = ZoneInfo("Asia/Kolkata")


class MemoryBookRepository(BookRepository):
    """In-memory book repository for fast local development and unit tests."""

    def __init__(self):
        self._store: Dict[str, List[Book]] = defaultdict(list)

    def _generate_next_book_id(self, user_id: str) -> str:
        max_num = 0
        for b in self._store[user_id]:
            if b.book_id.startswith("BOOK-"):
                try:
                    num = int(b.book_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"BOOK-{max_num + 1:03d}"

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[Book]:
        return list(self._store[user_id])

    async def get(self, book_id: str, user_id: str = "owner") -> Optional[Book]:
        for b in self._store[user_id]:
            if b.book_id.strip() == book_id.strip():
                return b
        return None

    async def create(self, data: BookCreate, user_id: str = "owner") -> Book:
        new_id = self._generate_next_book_id(user_id)
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        book = Book(
            book_id=new_id,
            user_id=user_id,
            created_at=today_str,
            updated_at=today_str,
            **data.model_dump(),
        )
        self._store[user_id].insert(0, book)
        return book

    async def update(self, book_id: str, updates: BookUpdate, user_id: str = "owner") -> Optional[Book]:
        for idx, b in enumerate(self._store[user_id]):
            if b.book_id == book_id:
                today_str = datetime.now(IST).strftime("%Y-%m-%d")
                updated_book = b.model_copy(
                    update={**updates.model_dump(exclude_unset=True), "updated_at": today_str}
                )
                self._store[user_id][idx] = updated_book
                return updated_book
        return None

    async def delete(self, book_id: str, user_id: str = "owner") -> bool:
        before = len(self._store[user_id])
        self._store[user_id] = [b for b in self._store[user_id] if b.book_id != book_id]
        return len(self._store[user_id]) < before

    async def batch_update_covers(self, items: List[Dict[str, str]], user_id: str = "owner") -> int:
        cover_map = {item["book_id"]: item["cover_url"] for item in items if item.get("book_id") and item.get("cover_url")}
        count = 0
        for idx, b in enumerate(self._store[user_id]):
            if b.book_id in cover_map:
                self._store[user_id][idx] = b.model_copy(update={"cover_url": cover_map[b.book_id]})
                count += 1
        return count
