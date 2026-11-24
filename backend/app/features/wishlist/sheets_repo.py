# backend/app/features/wishlist/sheets_repo.py
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
import httpx
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest, WISHLIST_COLUMNS
from app.features.wishlist.repository import WishlistRepository
from app.features.books.models import Book, BookCondition, ReadingStatus, BOOKS_SCHEMA_COLUMNS

logger = logging.getLogger("molat.wishlist.sheets")
IST = ZoneInfo("Asia/Kolkata")


def _sanitize(val: Any) -> Any:
    if val is None:
        return ""
    s = str(val)
    if s.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + s
    return val


def _from_sheet_row(r: Dict[str, Any], user_id: str = "owner") -> WishlistItem:
    return WishlistItem(
        wishlist_id=str(r.get("wishlist_id") or ""),
        user_id=user_id,
        title=str(r.get("title") or "Untitled"),
        authors=r.get("authors") or None,
        isbn_13=str(r.get("isbn_13")) if r.get("isbn_13") else None,
        genre=r.get("genre") or None,
        expected_rp=float(r.get("expected_rp")) if r.get("expected_rp") not in (None, "") else None,
        target_price=float(r.get("target_price")) if r.get("target_price") not in (None, "") else None,
        priority=r.get("priority") or "MEDIUM",
        notes=r.get("notes") or None,
        created_at=str(r.get("created_at") or ""),
    )


class SheetsWishlistRepository(WishlistRepository):
    def __init__(self, bridge_url: str, bridge_token: Optional[str] = None, book_repo=None):
        self.bridge_url = bridge_url
        self.bridge_token = bridge_token
        self.book_repo = book_repo

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=15.0, follow_redirects=True)

    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[WishlistItem]:
        params = {"table": "Wishlist"}
        if self.bridge_token:
            params["token"] = self.bridge_token
        try:
            async with self._client() as client:
                resp = await client.get(self.bridge_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                raw_rows = data.get("rows") or []
                return [_from_sheet_row(r, user_id=user_id) for r in raw_rows if r.get("wishlist_id")]
        except Exception as e:
            logger.error(f"Failed to fetch wishlist from sheets: {e}")
            return []

    async def create(self, data: WishlistItemCreate, user_id: str = "owner") -> WishlistItem:
        existing = await self.list(user_id=user_id)
        max_num = 0
        for w in existing:
            if w.wishlist_id.startswith("WISH-"):
                try:
                    num = int(w.wishlist_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        new_id = f"WISH-{max_num + 1:03d}"
        today_str = datetime.now(IST).strftime("%Y-%m-%d")

        item = WishlistItem(
            wishlist_id=new_id,
            user_id=user_id,
            created_at=today_str,
            **data.model_dump(),
        )

        sheet_row = [
            item.wishlist_id,
            item.title,
            item.authors or "",
            item.isbn_13 or "",
            item.genre or "",
            item.expected_rp if item.expected_rp is not None else "",
            item.target_price if item.target_price is not None else "",
            item.priority or "MEDIUM",
            item.notes or "",
            item.created_at,
        ]

        payload = {
            "token": self.bridge_token or "",
            "action": "append",
            "table": "Wishlist",
            "record": dict(zip(WISHLIST_COLUMNS, [_sanitize(v) for v in sheet_row])),
        }
        async with self._client() as client:
            await client.post(self.bridge_url, json=payload)
        return item

    async def acquire(self, wishlist_id: str, acquire_data: WishlistAcquireRequest, user_id: str = "owner") -> Optional[Book]:
        items = await self.list(user_id=user_id)
        target = next((w for w in items if w.wishlist_id == wishlist_id), None)
        if not target:
            return None

        today_str = datetime.now(IST).strftime("%Y-%m-%d")
        price = acquire_data.purchase_price if acquire_data.purchase_price is not None else target.target_price

        # Next book ID
        next_book_id = "BOOK-001"
        if self.book_repo:
            books = await self.book_repo.list(user_id=user_id)
            max_num = 0
            for b in books:
                if b.book_id.startswith("BOOK-"):
                    try:
                        num = int(b.book_id.split("-")[1])
                        if num > max_num:
                            max_num = num
                    except (IndexError, ValueError):
                        pass
            next_book_id = f"BOOK-{max_num + 1:03d}"

        book = Book(
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

        # Append book
        book_payload = {
            "token": self.bridge_token or "",
            "action": "append",
            "table": "Books",
            "record": dict(zip(BOOKS_SCHEMA_COLUMNS, [_sanitize(v) for v in [
                book.book_id, book.title, "", book.authors or "", "", book.isbn_13 or "",
                "", "", book.language, book.genre or "", "", book.reading_status.value,
                book.condition.value, book.location, book.purchase_price or "", book.rp or "",
                book.purchase_date or "", "", book.notes or "", book.created_at, book.updated_at
            ]])),
        }
        # Delete from wishlist
        wish_payload = {
            "token": self.bridge_token or "",
            "action": "delete",
            "table": "Wishlist",
            "keyField": "wishlist_id",
            "keyValue": wishlist_id,
        }
        async with self._client() as client:
            await client.post(self.bridge_url, json=book_payload)
            await client.post(self.bridge_url, json=wish_payload)

        return book
