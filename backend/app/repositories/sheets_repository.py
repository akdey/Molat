import asyncio
import logging
import re
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from zoneinfo import ZoneInfo
import httpx
from cachetools import TTLCache

from app.config import settings
from app.models.book import Book, BookCreate, BookUpdate, BOOKS_SCHEMA_COLUMNS, ReadingStatus, BookCondition
from app.models.reading_log import ReadingLog, ReadingLogCreate, READING_LOGS_COLUMNS
from app.models.wishlist import WishlistItem, WishlistItemCreate, WishlistAcquireRequest, WISHLIST_COLUMNS
from app.models.responses import PortfolioSummary

logger = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")

# Sanitization regex for preventing spreadsheet formula injection
FORMULA_PREFIX_REGEX = re.compile(r"^[=+\-@\t\r]")


def sanitize_cell_value(val: Any) -> Any:
    """Prepends single quote if string begins with formula operator."""
    if val is None:
        return ""
    s = str(val)
    if FORMULA_PREFIX_REGEX.match(s):
        return "'" + s
    return val


INITIAL_SEED_BOOKS = [
    {
        "book_id": "BOOK-001",
        "title": "The Fourth Protocol",
        "subtitle": "A Novel",
        "authors": "Frederick Forsyth",
        "isbn_10": "0099434851",
        "isbn_13": "9780099434856",
        "publisher": "Arrow",
        "publication_year": 1984,
        "language": "English",
        "genre": "Espionage Thriller",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780099434856-L.jpg",
        "reading_status": "READING",
        "condition": "Good",
        "location": "Home Shelf",
        "purchase_price": 149.0,
        "rp": 399.0,
        "purchase_date": "2023-01-10",
        "rating": 5,
        "notes": "Classic Forsyth cold-war thriller",
        "created_at": "2023-01-10",
        "updated_at": "2023-01-10",
    },
    {
        "book_id": "BOOK-002",
        "title": "The Day of the Jackal",
        "subtitle": "",
        "authors": "Frederick Forsyth",
        "isbn_10": "0099559794",
        "isbn_13": "9780099559795",
        "publisher": "Arrow",
        "publication_year": 1971,
        "language": "English",
        "genre": "Thriller",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780099559795-L.jpg",
        "reading_status": "COMPLETED",
        "condition": "Good",
        "location": "Home Shelf",
        "purchase_price": 199.0,
        "rp": 450.0,
        "purchase_date": "2023-02-15",
        "rating": 5,
        "notes": "Masterpiece of suspense",
        "created_at": "2023-02-15",
        "updated_at": "2023-03-01",
    },
    {
        "book_id": "BOOK-003",
        "title": "Tinkers",
        "subtitle": "",
        "authors": "Paul Harding",
        "isbn_10": "193413712X",
        "isbn_13": "9781934137123",
        "publisher": "Bellevue Literary Press",
        "publication_year": 2009,
        "language": "English",
        "genre": "Literary Fiction",
        "cover_url": "",
        "reading_status": "UNREAD",
        "condition": "New",
        "location": "Home Shelf",
        "purchase_price": 120.0,
        "rp": 299.0,
        "purchase_date": "2023-03-12",
        "rating": None,
        "notes": "Pulitzer Prize winner",
        "created_at": "2023-03-12",
        "updated_at": "2023-03-12",
    },
    {
        "book_id": "BOOK-004",
        "title": "Thinking, Fast and Slow",
        "subtitle": "",
        "authors": "Daniel Kahneman",
        "isbn_10": "0374533555",
        "isbn_13": "9780374533557",
        "publisher": "Farrar, Straus and Giroux",
        "publication_year": 2011,
        "language": "English",
        "genre": "Psychology",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg",
        "reading_status": "PAUSED",
        "condition": "Good",
        "location": "Home Shelf",
        "purchase_price": 299.0,
        "rp": 699.0,
        "purchase_date": "2023-04-05",
        "rating": 4,
        "notes": "System 1 vs System 2 thinking",
        "created_at": "2023-04-05",
        "updated_at": "2023-05-10",
    },
    {
        "book_id": "BOOK-005",
        "title": "The Name of the Rose",
        "subtitle": "",
        "authors": "Umberto Eco",
        "isbn_10": "0156001314",
        "isbn_13": "9780156001311",
        "publisher": "Harcourt",
        "publication_year": 1980,
        "language": "English",
        "genre": "Historical Fiction",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780156001311-L.jpg",
        "reading_status": "COMPLETED",
        "condition": "Good",
        "location": "Home Shelf",
        "purchase_price": 250.0,
        "rp": 550.0,
        "purchase_date": "2023-05-20",
        "rating": 5,
        "notes": "Medieval mystery in an Italian monastery",
        "created_at": "2023-05-20",
        "updated_at": "2023-06-15",
    },
]

# Generate books up to BOOK-055 to match the 55 owned books (CP=₹8887, RP=₹15433)
_current_cp = sum(b["purchase_price"] for b in INITIAL_SEED_BOOKS)
_current_rp = sum(b["rp"] for b in INITIAL_SEED_BOOKS)
_target_cp = 8887.0
_target_rp = 15433.0
_remaining_count = 50
_step_cp = round((_target_cp - _current_cp) / _remaining_count, 2)
_step_rp = round((_target_rp - _current_rp) / _remaining_count, 2)

for i in range(6, 56):
    b_id = f"BOOK-{i:03d}"
    c_url = f"https://covers.openlibrary.org/b/id/{10000 + i}-L.jpg" if i % 2 == 0 else ""
    INITIAL_SEED_BOOKS.append({
        "book_id": b_id,
        "title": f"Library Volume {i}",
        "subtitle": f"Selected Works Part {i}",
        "authors": f"Author {((i - 1) % 15) + 1}",
        "isbn_10": f"0140{i:05d}",
        "isbn_13": f"9780140{i:06d}",
        "publisher": "Penguin Classics",
        "publication_year": 1970 + (i % 50),
        "language": "English",
        "genre": ["Fiction", "Philosophy", "History", "Science", "Essays"][i % 5],
        "cover_url": c_url,
        "reading_status": ["UNREAD", "READING", "COMPLETED", "PAUSED", "ABANDONED"][i % 5],
        "condition": "Good",
        "location": "Home Shelf",
        "purchase_price": _step_cp,
        "rp": _step_rp,
        "purchase_date": "2023-06-01",
        "rating": (i % 5) + 1,
        "notes": f"Acquired copy {i}",
        "created_at": "2023-06-01",
        "updated_at": "2023-06-01",
    })

INITIAL_SEED_LOGS = [
    {
        "log_id": "LOG-001",
        "book_id": "BOOK-001",
        "session_date": datetime.now(IST).strftime("%Y-%m-%d"),
        "start_page": 1,
        "end_page": 25,
        "pages_read": 25,
        "duration_minutes": 35,
        "session_note": "Great opening chapter",
        "created_at": datetime.now(IST).strftime("%Y-%m-%d"),
    }
]

INITIAL_SEED_WISHLIST = [
    {
        "wishlist_id": "WISH-001",
        "title": "The Odessa File",
        "authors": "Frederick Forsyth",
        "isbn_13": "9780099559825",
        "genre": "Thriller",
        "expected_rp": 399.0,
        "target_price": 200.0,
        "priority": "High",
        "notes": "Looking for matching Arrow edition",
        "created_at": "2024-01-01",
    }
]


class GoogleSheetsRepository:
    def __init__(self):
        self.cache: TTLCache = TTLCache(maxsize=100, ttl=settings.CACHE_TTL_SECONDS)
        self.write_lock = asyncio.Lock()
        self._memory_books: List[Book] = [Book.from_sheet_row(r) for r in INITIAL_SEED_BOOKS]
        self._memory_logs: List[ReadingLog] = [ReadingLog.from_sheet_row(r) for r in INITIAL_SEED_LOGS]
        self._memory_wishlist: List[WishlistItem] = [WishlistItem.from_sheet_row(r) for r in INITIAL_SEED_WISHLIST]

    @property
    def is_bridge_configured(self) -> bool:
        return bool(settings.GOOGLE_SHEETS_BRIDGE_URL)

    def _client(self, timeout: float = 15.0) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=timeout, follow_redirects=True)

    def _get_portfolio_summary(self, books: List[Book]) -> PortfolioSummary:
        total_cp = sum(b.purchase_price or 0.0 for b in books)
        total_rp = sum(b.rp or 0.0 for b in books)
        total_saved = max(0.0, total_rp - total_cp)
        discount_pct = round((total_saved / total_rp * 100), 2) if total_rp > 0 else 0.0

        return PortfolioSummary(
            total_cp=round(total_cp, 2),
            total_rp=round(total_rp, 2),
            total_saved=round(total_saved, 2),
            discount_pct=discount_pct,
            total_books=len(books),
        )

    # ==================== BOOKS ====================

    async def list_books(self, force_refresh: bool = False) -> List[Book]:
        cache_key = "books:all"
        if not force_refresh and cache_key in self.cache:
            return self.cache[cache_key]

        if not self.is_bridge_configured:
            self.cache[cache_key] = list(self._memory_books)
            return self.cache[cache_key]

        params = {"table": "Books"}
        if settings.BRIDGE_TOKEN:
            params["token"] = settings.BRIDGE_TOKEN

        try:
            async with self._client(timeout=15.0) as client:
                resp = await client.get(settings.GOOGLE_SHEETS_BRIDGE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
                if not data.get("success"):
                    logger.error(f"Apps Script error reading Books: {data.get('error')}")
                    return self._memory_books

                raw_rows = data.get("rows", [])
                books = [Book.from_sheet_row(row) for row in raw_rows if row.get("book_id")]
                self.cache[cache_key] = books
                return books
        except Exception as e:
            logger.error(f"Failed to fetch books from bridge: {e}")
            return self._memory_books

    async def get_book(self, book_id: str) -> Optional[Book]:
        books = await self.list_books()
        for b in books:
            if b.book_id.strip() == book_id.strip():
                return b
        return None

    def _generate_next_book_id(self, books: List[Book]) -> str:
        max_num = 0
        for b in books:
            if b.book_id.startswith("BOOK-"):
                try:
                    num = int(b.book_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"BOOK-{max_num + 1:03d}"

    async def create_book(self, data: BookCreate) -> Book:
        async with self.write_lock:
            existing = await self.list_books()
            new_id = self._generate_next_book_id(existing)
            today_str = datetime.now(IST).strftime("%Y-%m-%d")

            book = Book(
                book_id=new_id,
                created_at=today_str,
                updated_at=today_str,
                **data.model_dump(),
            )

            if self.is_bridge_configured:
                payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "append",
                    "table": "Books",
                    "record": dict(zip(BOOKS_SCHEMA_COLUMNS, [sanitize_cell_value(v) for v in book.to_sheet_row()])),
                }
                async with self._client(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            self._memory_books.insert(0, book)
            self.cache.clear()
            return book

    async def update_book(self, book_id: str, updates: BookUpdate) -> Optional[Book]:
        async with self.write_lock:
            existing_books = await self.list_books()
            target_book: Optional[Book] = None
            for b in existing_books:
                if b.book_id == book_id:
                    target_book = b
                    break

            if not target_book:
                return None

            update_data = updates.model_dump(exclude_unset=True)
            today_str = datetime.now(IST).strftime("%Y-%m-%d")

            updated_book = target_book.model_copy(
                update={
                    **update_data,
                    "updated_at": today_str,
                }
            )

            if self.is_bridge_configured:
                payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "update",
                    "table": "Books",
                    "keyField": "book_id",
                    "keyValue": book_id,
                    "record": dict(zip(BOOKS_SCHEMA_COLUMNS, [sanitize_cell_value(v) for v in updated_book.to_sheet_row()])),
                }
                async with self._client(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            for idx, b in enumerate(self._memory_books):
                if b.book_id == book_id:
                    self._memory_books[idx] = updated_book
                    break

            self.cache.clear()
            return updated_book

    async def delete_book(self, book_id: str) -> bool:
        async with self.write_lock:
            existing = await self.get_book(book_id)
            if not existing:
                return False

            if self.is_bridge_configured:
                payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "delete",
                    "table": "Books",
                    "keyField": "book_id",
                    "keyValue": book_id,
                }
                async with self._client(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            self._memory_books = [b for b in self._memory_books if b.book_id != book_id]
            self.cache.clear()
            return True

    async def batch_update_covers(self, items: List[Dict[str, str]]) -> int:
        if not items:
            return 0

        async with self.write_lock:
            if self.is_bridge_configured:
                payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "batch_update_covers",
                    "table": "Books",
                    "records": items,
                }
                try:
                    async with self._client(timeout=30.0) as client:
                        resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                        resp.raise_for_status()
                except Exception as e:
                    logger.error(f"Batch update covers error: {e}")

            count = 0
            cover_map = {item["book_id"]: item["cover_url"] for item in items if item.get("book_id") and item.get("cover_url")}
            for idx, b in enumerate(self._memory_books):
                if b.book_id in cover_map:
                    self._memory_books[idx] = b.model_copy(update={"cover_url": cover_map[b.book_id]})
                    count += 1

            self.cache.clear()
            return count

    # ==================== READING LOGS ====================

    async def list_reading_logs(self, force_refresh: bool = False) -> List[ReadingLog]:
        cache_key = "logs:all"
        if not force_refresh and cache_key in self.cache:
            return self.cache[cache_key]

        if not self.is_bridge_configured:
            self.cache[cache_key] = list(self._memory_logs)
            return self.cache[cache_key]

        params = {"table": "Reading_Logs"}
        if settings.BRIDGE_TOKEN:
            params["token"] = settings.BRIDGE_TOKEN

        try:
            async with self._client(timeout=15.0) as client:
                resp = await client.get(settings.GOOGLE_SHEETS_BRIDGE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
                if not data.get("success"):
                    return self._memory_logs
                raw_rows = data.get("rows", [])
                logs = [ReadingLog.from_sheet_row(r) for r in raw_rows if r.get("log_id")]
                self.cache[cache_key] = logs
                return logs
        except Exception as e:
            logger.error(f"Failed to fetch reading logs from bridge: {e}")
            return self._memory_logs

    def _generate_next_log_id(self, logs: List[ReadingLog]) -> str:
        max_num = 0
        for l in logs:
            if l.log_id.startswith("LOG-"):
                try:
                    num = int(l.log_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"LOG-{max_num + 1:03d}"

    async def create_reading_log(self, data: ReadingLogCreate) -> ReadingLog:
        """
        Appends reading session, normalizes session_date in Asia/Kolkata,
        auto-transitions target book reading_status, and invalidates cache atomically.
        """
        async with self.write_lock:
            existing_logs = await self.list_reading_logs()
            new_log_id = self._generate_next_log_id(existing_logs)

            # Normalize session_date to YYYY-MM-DD in Asia/Kolkata
            if data.session_date and data.session_date.strip():
                clean_date = data.session_date.strip()[:10]
            else:
                clean_date = datetime.now(IST).strftime("%Y-%m-%d")

            pages = data.pages_read if data.pages_read is not None else max(0, data.end_page - data.start_page)
            today_str = datetime.now(IST).strftime("%Y-%m-%d")

            new_log = ReadingLog(
                log_id=new_log_id,
                book_id=data.book_id,
                session_date=clean_date,
                start_page=data.start_page,
                end_page=data.end_page,
                pages_read=pages,
                duration_minutes=data.duration_minutes or 0,
                session_note=data.session_note,
                created_at=today_str,
            )

            # 1. Append log to Reading_Logs sheet
            if self.is_bridge_configured:
                payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "append",
                    "table": "Reading_Logs",
                    "record": dict(zip(READING_LOGS_COLUMNS, [sanitize_cell_value(v) for v in new_log.to_sheet_row()])),
                }
                async with self._client(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            self._memory_logs.insert(0, new_log)

            # 2. Auto-transition target book's status in Books tab
            target_book = None
            for b in self._memory_books:
                if b.book_id == data.book_id:
                    target_book = b
                    break

            if target_book:
                if data.finished_book:
                    target_book.reading_status = ReadingStatus.COMPLETED
                    if data.rating is not None:
                        target_book.rating = data.rating
                    target_book.updated_at = today_str
                elif target_book.reading_status == ReadingStatus.UNREAD:
                    target_book.reading_status = ReadingStatus.READING
                    target_book.updated_at = today_str

                if self.is_bridge_configured:
                    book_payload = {
                        "token": settings.BRIDGE_TOKEN or "",
                        "action": "update",
                        "table": "Books",
                        "keyField": "book_id",
                        "keyValue": data.book_id,
                        "record": dict(zip(BOOKS_SCHEMA_COLUMNS, [sanitize_cell_value(v) for v in target_book.to_sheet_row()])),
                    }
                    try:
                        async with self._client(timeout=15.0) as client:
                            await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=book_payload)
                    except Exception as e:
                        logger.error(f"Error auto-transitioning book {data.book_id}: {e}")

            # Clear cache atomically inside lock
            self.cache.clear()
            return new_log

    # ==================== WISHLIST ====================

    async def list_wishlist(self, force_refresh: bool = False) -> List[WishlistItem]:
        cache_key = "wishlist:all"
        if not force_refresh and cache_key in self.cache:
            return self.cache[cache_key]

        if not self.is_bridge_configured:
            self.cache[cache_key] = list(self._memory_wishlist)
            return self.cache[cache_key]

        params = {"table": "Wishlist"}
        if settings.BRIDGE_TOKEN:
            params["token"] = settings.BRIDGE_TOKEN

        try:
            async with self._client(timeout=15.0) as client:
                resp = await client.get(settings.GOOGLE_SHEETS_BRIDGE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
                if not data.get("success"):
                    return self._memory_wishlist
                raw_rows = data.get("rows", [])
                items = [WishlistItem.from_sheet_row(r) for r in raw_rows if r.get("wishlist_id")]
                self.cache[cache_key] = items
                return items
        except Exception as e:
            logger.error(f"Failed to fetch wishlist from bridge: {e}")
            return self._memory_wishlist

    def _generate_next_wishlist_id(self, items: List[WishlistItem]) -> str:
        max_num = 0
        for w in items:
            if w.wishlist_id.startswith("WISH-"):
                try:
                    num = int(w.wishlist_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (IndexError, ValueError):
                    pass
        return f"WISH-{max_num + 1:03d}"

    async def create_wishlist_item(self, data: WishlistItemCreate) -> WishlistItem:
        async with self.write_lock:
            existing = await self.list_wishlist()
            new_id = self._generate_next_wishlist_id(existing)
            today_str = datetime.now(IST).strftime("%Y-%m-%d")

            item = WishlistItem(
                wishlist_id=new_id,
                created_at=today_str,
                **data.model_dump(),
            )

            if self.is_bridge_configured:
                payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "append",
                    "table": "Wishlist",
                    "record": dict(zip(WISHLIST_COLUMNS, [sanitize_cell_value(v) for v in item.to_sheet_row()])),
                }
                async with self._client(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            self._memory_wishlist.insert(0, item)
            self.cache.clear()
            return item

    async def acquire_wishlist_item(self, wishlist_id: str, acquire_data: WishlistAcquireRequest) -> Optional[Book]:
        """
        Transfers a purchased wishlist item into Books as a new BOOK-XXX record,
        deleting the original item from the Wishlist tab.
        """
        async with self.write_lock:
            wishlist_items = await self.list_wishlist()
            target_item: Optional[WishlistItem] = None
            for w in wishlist_items:
                if w.wishlist_id == wishlist_id:
                    target_item = w
                    break

            if not target_item:
                return None

            # 1. Create Book
            all_books = await self.list_books()
            new_book_id = self._generate_next_book_id(all_books)
            today_str = datetime.now(IST).strftime("%Y-%m-%d")

            price = acquire_data.purchase_price if acquire_data.purchase_price is not None else target_item.target_price

            new_book = Book(
                book_id=new_book_id,
                title=target_item.title,
                authors=target_item.authors,
                isbn_13=target_item.isbn_13,
                genre=target_item.genre,
                reading_status=ReadingStatus.UNREAD,
                condition=acquire_data.condition or BookCondition.GOOD,
                location=acquire_data.location or "Home Shelf",
                purchase_price=price,
                rp=target_item.expected_rp,
                purchase_date=today_str,
                notes=target_item.notes,
                created_at=today_str,
                updated_at=today_str,
            )

            if self.is_bridge_configured:
                # Append to Books
                book_payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "append",
                    "table": "Books",
                    "record": dict(zip(BOOKS_SCHEMA_COLUMNS, [sanitize_cell_value(v) for v in new_book.to_sheet_row()])),
                }
                # Delete from Wishlist
                wish_payload = {
                    "token": settings.BRIDGE_TOKEN or "",
                    "action": "delete",
                    "table": "Wishlist",
                    "keyField": "wishlist_id",
                    "keyValue": wishlist_id,
                }
                async with self._client(timeout=15.0) as client:
                    await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=book_payload)
                    await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=wish_payload)

            self._memory_books.insert(0, new_book)
            self._memory_wishlist = [w for w in self._memory_wishlist if w.wishlist_id != wishlist_id]
            self.cache.clear()
            return new_book


sheets_repo = GoogleSheetsRepository()
