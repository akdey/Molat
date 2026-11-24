# backend/app/features/books/sheets_repo.py
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
import httpx
from app.features.books.models import Book, BookCreate, BookUpdate, BOOKS_SCHEMA_COLUMNS, ReadingStatus, BookCondition
from app.features.books.repository import BookRepository

logger = logging.getLogger("molat.books.sheets")
IST = ZoneInfo("Asia/Kolkata")


def _sanitize(val: Any) -> Any:
    if val is None:
        return ""
    s = str(val)
    if s.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + s
    return val


def _to_sheet_row(book: Book) -> List[Any]:
    return [
        book.book_id,
        book.title,
        book.subtitle or "",
        book.authors or "",
        book.isbn_10 or "",
        book.isbn_13 or "",
        book.publisher or "",
        book.publication_year or "",
        book.language or "English",
        book.genre or "",
        book.cover_url or "",
        book.reading_status.value if hasattr(book.reading_status, "value") else book.reading_status,
        book.condition.value if hasattr(book.condition, "value") else book.condition,
        book.location or "Home Shelf",
        book.purchase_price if book.purchase_price is not None else "",
        book.rp if book.rp is not None else "",
        book.purchase_date or "",
        book.rating or "",
        book.notes or "",
        book.created_at or "",
        book.updated_at or "",
    ]


def _from_sheet_row(row: Dict[str, Any], user_id: str = "owner") -> Book:
    return Book(
        book_id=str(row.get("book_id") or ""),
        user_id=user_id,
        title=str(row.get("title") or "Untitled"),
        subtitle=row.get("subtitle") or None,
        authors=row.get("authors") or None,
        isbn_10=str(row.get("isbn_10")) if row.get("isbn_10") else None,
        isbn_13=str(row.get("isbn_13")) if row.get("isbn_13") else None,
        publisher=row.get("publisher") or None,
        publication_year=int(float(str(row.get("publication_year")))) if row.get("publication_year") else None,
        language=row.get("language") or "English",
        genre=row.get("genre") or None,
        cover_url=row.get("cover_url") or None,
        reading_status=ReadingStatus(row.get("reading_status")) if row.get("reading_status") in ReadingStatus._value2member_map_ else ReadingStatus.UNREAD,
        condition=BookCondition(row.get("condition")) if row.get("condition") in BookCondition._value2member_map_ else BookCondition.GOOD,
        location=row.get("location") or "Home Shelf",
        purchase_price=float(row.get("purchase_price")) if row.get("purchase_price") not in (None, "") else None,
        rp=float(row.get("rp")) if row.get("rp") not in (None, "") else None,
        purchase_date=str(row.get("purchase_date")) if row.get("purchase_date") else None,
        rating=int(float(str(row.get("rating")))) if row.get("rating") not in (None, "") else None,
        notes=row.get("notes") or None,
        created_at=str(row.get("created_at")) if row.get("created_at") else None,
        updated_at=str(row.get("updated_at")) if row.get("updated_at") else None,
    )


class SheetsBookRepository(BookRepository):
    """Google Sheets implementation backed by Google Apps Script web app."""

    def __init__(self, bridge_url: str, bridge_token: Optional[str] = None):
        self.bridge_url = bridge_url
        self.bridge_token = bridge_token

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=15.0, follow_redirects=True)

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[Book]:
        params = {"table": "Books"}
        if self.bridge_token:
            params["token"] = self.bridge_token
        try:
            async with self._client() as client:
                resp = await client.get(self.bridge_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                raw_rows = data.get("books") or data.get("rows") or []
                books = []
                for idx, r in enumerate(raw_rows, start=1):
                    if not r.get("book_id"):
                        r["book_id"] = f"BOOK-{idx:03d}"
                    if r.get("title") or r.get("book_id"):
                        try:
                            books.append(_from_sheet_row(r, user_id=user_id))
                        except Exception as e:
                            logger.warning(f"Error parsing sheet book: {e}")
                return books
        except Exception as e:
            logger.error(f"Failed to fetch books from sheets bridge: {e}")
            return []

    async def get(self, book_id: str, user_id: str = "owner") -> Optional[Book]:
        books = await self.list(user_id=user_id)
        for b in books:
            if b.book_id.strip() == book_id.strip():
                return b
        return None

    async def create(self, data: BookCreate, user_id: str = "owner") -> Book:
        books = await self.list(user_id=user_id)
        max_num = 0
        for b in books:
            if b.book_id.startswith("BOOK-"):
                try:
                    num = int(b.book_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        new_id = f"BOOK-{max_num + 1:03d}"
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        book = Book(
            book_id=new_id,
            user_id=user_id,
            created_at=today_str,
            updated_at=today_str,
            **data.model_dump(),
        )

        payload = {
            "token": self.bridge_token or "",
            "action": "append",
            "table": "Books",
            "record": dict(zip(BOOKS_SCHEMA_COLUMNS, [_sanitize(v) for v in _to_sheet_row(book)])),
        }
        async with self._client() as client:
            resp = await client.post(self.bridge_url, json=payload)
            resp.raise_for_status()
        return book

    async def update(self, book_id: str, updates: BookUpdate, user_id: str = "owner") -> Optional[Book]:
        target = await self.get(book_id, user_id=user_id)
        if not target:
            return None
        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        updated_book = target.model_copy(
            update={**updates.model_dump(exclude_unset=True), "updated_at": today_str}
        )
        payload = {
            "token": self.bridge_token or "",
            "action": "update",
            "table": "Books",
            "keyField": "book_id",
            "keyValue": book_id,
            "record": dict(zip(BOOKS_SCHEMA_COLUMNS, [_sanitize(v) for v in _to_sheet_row(updated_book)])),
        }
        async with self._client() as client:
            resp = await client.post(self.bridge_url, json=payload)
            resp.raise_for_status()
        return updated_book

    async def delete(self, book_id: str, user_id: str = "owner") -> bool:
        target = await self.get(book_id, user_id=user_id)
        if not target:
            return False
        payload = {
            "token": self.bridge_token or "",
            "action": "delete",
            "table": "Books",
            "keyField": "book_id",
            "keyValue": book_id,
        }
        async with self._client() as client:
            resp = await client.post(self.bridge_url, json=payload)
            resp.raise_for_status()
        return True

    async def batch_update_covers(self, items: List[Dict[str, str]], user_id: str = "owner") -> int:
        valid_items = [it for it in items if it.get("book_id") and it.get("cover_url")]
        if not valid_items:
            return 0
        payload = {
            "token": self.bridge_token or "",
            "action": "batch_update_covers",
            "table": "Books",
            "records": valid_items,
        }
        async with self._client() as client:
            resp = await client.post(self.bridge_url, json=payload)
            resp.raise_for_status()
        return len(valid_items)
