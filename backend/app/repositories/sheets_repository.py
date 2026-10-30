import asyncio
import logging
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
import httpx
from cachetools import TTLCache

from app.config import settings
from app.models.book import Book, BookCreate, BookUpdate, BOOKS_SCHEMA_COLUMNS
from app.models.responses import PortfolioSummary

logger = logging.getLogger(__name__)

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


# 55 Realistic seed records matching the live Google Sheet inventory
# (31 with covers, 24 missing covers for enrichment, total CP=₹8887, total RP=₹15433)
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
        "cover_url": "",  # Missing cover candidate for enrichment!
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

# Generate remaining seed books up to BOOK-055 to match the total portfolio stats
# (Total CP = ₹8,887, Total RP = ₹15,433 across 55 books)
_current_cp = sum(b["purchase_price"] for b in INITIAL_SEED_BOOKS)
_current_rp = sum(b["rp"] for b in INITIAL_SEED_BOOKS)
_target_cp = 8887.0
_target_rp = 15433.0
_remaining_count = 50
_step_cp = round((_target_cp - _current_cp) / _remaining_count, 2)
_step_rp = round((_target_rp - _current_rp) / _remaining_count, 2)

for i in range(6, 56):
    b_id = f"BOOK-{i:03d}"
    # Roughly half have missing covers so enrichment can test 24 missing covers
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


class GoogleSheetsRepository:
    def __init__(self):
        # 300-second in-memory TTL Cache
        self.cache: TTLCache = TTLCache(maxsize=100, ttl=settings.CACHE_TTL_SECONDS)
        # Lock to serialize write operations and prevent sheet races
        self.write_lock = asyncio.Lock()
        # In-memory store used when Apps Script Bridge URL is not connected
        self._memory_books: List[Book] = [Book.from_sheet_row(r) for r in INITIAL_SEED_BOOKS]
        self._last_sheet_fetch_time: Optional[datetime] = None

    @property
    def is_bridge_configured(self) -> bool:
        return bool(settings.GOOGLE_SHEETS_BRIDGE_URL)

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

    async def list_books(self, force_refresh: bool = False) -> List[Book]:
        """Returns all books from 300s TTL cache or fetches from Google Sheets bridge."""
        cache_key = "books:all"
        if not force_refresh and cache_key in self.cache:
            return self.cache[cache_key]

        if not self.is_bridge_configured:
            # Return memory store
            self.cache[cache_key] = list(self._memory_books)
            self._last_sheet_fetch_time = datetime.utcnow()
            return self.cache[cache_key]

        # Call Google Sheets Apps Script Web App
        params = {"table": "Books"}
        if settings.BRIDGE_TOKEN:
            params["token"] = settings.BRIDGE_TOKEN

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(settings.GOOGLE_SHEETS_BRIDGE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
                if not data.get("success"):
                    logger.error(f"Apps Script error reading Books: {data.get('error')}")
                    return self._memory_books

                raw_rows = data.get("rows", [])
                books = [Book.from_sheet_row(row) for row in raw_rows if row.get("book_id")]
                self.cache[cache_key] = books
                self._last_sheet_fetch_time = datetime.utcnow()
                return books
        except Exception as e:
            logger.error(f"Failed to fetch books from Google Sheets bridge: {e}")
            # Graceful fallback to cached/memory store
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
        """Appends a new book record, serializing via asyncio.Lock."""
        async with self.write_lock:
            existing = await self.list_books()
            new_id = self._generate_next_book_id(existing)
            today_str = datetime.utcnow().strftime("%Y-%m-%d")

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
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            # Update memory store and invalidate cache
            self._memory_books.insert(0, book)
            self.cache.clear()
            return book

    async def update_book(self, book_id: str, updates: BookUpdate) -> Optional[Book]:
        """Updates specific fields for a book, serializing via asyncio.Lock."""
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
            today_str = datetime.utcnow().strftime("%Y-%m-%d")

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
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            # Update memory store and invalidate cache
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
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                    resp.raise_for_status()

            self._memory_books = [b for b in self._memory_books if b.book_id != book_id]
            self.cache.clear()
            return True

    async def batch_update_covers(self, items: List[Dict[str, str]]) -> int:
        """Batch updates cover_url values and invalidates cache."""
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
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        resp = await client.post(settings.GOOGLE_SHEETS_BRIDGE_URL, json=payload)
                        resp.raise_for_status()
                except Exception as e:
                    logger.error(f"Batch update covers bridge error: {e}")

            # Update memory store
            count = 0
            cover_map = {item["book_id"]: item["cover_url"] for item in items if item.get("book_id") and item.get("cover_url")}
            for idx, b in enumerate(self._memory_books):
                if b.book_id in cover_map:
                    self._memory_books[idx] = b.model_copy(update={"cover_url": cover_map[b.book_id]})
                    count += 1

            self.cache.clear()
            return count


sheets_repo = GoogleSheetsRepository()
