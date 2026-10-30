import logging
import asyncio
from typing import Optional, List, Dict
import httpx
from app.models.book import Book

logger = logging.getLogger(__name__)


class CoverEnrichmentService:
    def __init__(self, timeout: float = 6.0):
        self.timeout = timeout

    async def resolve_cover_url(self, book: Book) -> Optional[str]:
        """
        Waterfall cover resolution:
        1. Google Books API (by ISBN-13 / ISBN-10)
        2. Apple Books India (iTunes Search API with country=IN)
        3. Open Library cover_i fallback
        """
        isbn = book.isbn_13 or book.isbn_10

        # 1. Google Books
        if isbn:
            gb_cover = await self._query_google_books_isbn(isbn)
            if gb_cover and self._is_valid_cover_url(gb_cover):
                return gb_cover

        # 2. Apple Books India (by Title + Authors or ISBN)
        apple_query = f"{book.title} {book.authors or ''}".strip()
        apple_cover = await self._query_apple_books_in(apple_query)
        if apple_cover and self._is_valid_cover_url(apple_cover):
            return apple_cover

        # 3. Open Library cover_i
        if isbn:
            ol_cover = await self._query_open_library_cover(isbn)
            if ol_cover and self._is_valid_cover_url(ol_cover):
                return ol_cover

        return None

    def _is_valid_cover_url(self, url: str) -> bool:
        """1x1 Pixel & Malformed URL Guard."""
        if not url or not isinstance(url, str):
            return False
        clean = url.strip().lower()
        if not (clean.startswith("https://") or clean.startswith("http://")):
            return False
        # Known 1x1 transparent/blank placeholders
        if "data:image" in clean or "pixel.gif" in clean or "1x1" in clean or "blank.gif" in clean:
            return False
        return True

    async def _query_google_books_isbn(self, isbn: str) -> Optional[str]:
        url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}&maxResults=1"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return None
                data = res.json()
                items = data.get("items", [])
                if not items:
                    return None
                images = items[0].get("volumeInfo", {}).get("imageLinks", {})
                img = images.get("extraLarge") or images.get("large") or images.get("medium") or images.get("thumbnail")
                if img:
                    if img.startswith("http://"):
                        img = "https://" + img[7:]
                    return img
        except Exception as e:
            logger.debug(f"Google Books cover query error for {isbn}: {e}")
        return None

    async def _query_apple_books_in(self, query: str) -> Optional[str]:
        """Queries Apple Books India (country=IN, media=ebook)."""
        url = "https://itunes.apple.com/search"
        params = {
            "term": query,
            "country": "IN",
            "media": "ebook",
            "entity": "ebook",
            "limit": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, params=params)
                if res.status_code != 200:
                    return None
                data = res.json()
                results = data.get("results", [])
                if not results:
                    return None
                # Extract highest resolution artwork URL
                artwork = results[0].get("artworkUrl100", "")
                if artwork:
                    # Apple artwork can be upscaled by replacing dimensions (e.g. 100x100bb -> 600x600bb)
                    artwork_high_res = artwork.replace("100x100bb", "600x600bb")
                    return artwork_high_res
        except Exception as e:
            logger.debug(f"Apple Books IN cover query error for {query}: {e}")
        return None

    async def _query_open_library_cover(self, isbn: str) -> Optional[str]:
        """Resolves Open Library cover_i attribute."""
        url = f"https://openlibrary.org/search.json?isbn={isbn}&fields=cover_i&limit=1"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return None
                data = res.json()
                docs = data.get("docs", [])
                if docs and docs[0].get("cover_i"):
                    cover_id = docs[0]["cover_i"]
                    return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
        except Exception as e:
            logger.debug(f"Open Library cover query error for {isbn}: {e}")
        return None

    async def enrich_missing_covers(self, books: List[Book]) -> List[Dict[str, str]]:
        """Finds all books with blank cover_url and resolves them concurrently."""
        missing = [b for b in books if not b.cover_url or b.cover_url.strip() == ""]
        if not missing:
            return []

        logger.info(f"Enriching {len(missing)} books with missing covers...")
        updates: List[Dict[str, str]] = []

        # Concurrently resolve up to 5 at a time
        semaphore = asyncio.Semaphore(5)

        async def worker(b: Book):
            async with semaphore:
                found_url = await self.resolve_cover_url(b)
                if found_url:
                    updates.append({"book_id": b.book_id, "cover_url": found_url})

        await asyncio.gather(*(worker(b) for b in missing))
        logger.info(f"Cover enrichment completed: found {len(updates)} covers out of {len(missing)} missing.")
        return updates


cover_enricher = CoverEnrichmentService()

