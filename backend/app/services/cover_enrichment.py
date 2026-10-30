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
        Multi-tier waterfall cover resolution with comprehensive fallbacks:
        1. Google Books (by ISBN-13 / ISBN-10)
        2. Google Books (by Title + Author)
        3. Apple Books India (iTunes Search API, country=IN, 600x600 artwork)
        4. Apple Books Global (iTunes Search API, country=US, 600x600 artwork)
        5. Open Library (by ISBN cover_i)
        6. Open Library (by Title + Author cover_i)
        7. Open Library Direct Jacket Endpoint (by ISBN)
        """
        isbn = (book.isbn_13 or book.isbn_10 or "").strip()
        title = (book.title or "").strip()
        author = (book.authors or "").strip()

        # 1. Google Books by ISBN
        if isbn:
            gb_isbn_cover = await self._query_google_books_isbn(isbn)
            if gb_isbn_cover and self._is_valid_cover_url(gb_isbn_cover):
                return gb_isbn_cover

        # 2. Google Books by Title + Author (finds books where ISBN is unindexed or missing)
        if title:
            gb_title_cover = await self._query_google_books_title_author(title, author)
            if gb_title_cover and self._is_valid_cover_url(gb_title_cover):
                return gb_title_cover

        # 3. Apple Books India (High-res artwork for Indian & global releases)
        search_term = f"{title} {author}".strip() or isbn
        if search_term:
            apple_in_cover = await self._query_apple_books(search_term, country="IN")
            if apple_in_cover and self._is_valid_cover_url(apple_in_cover):
                return apple_in_cover

        # 4. Apple Books Global (country=US fallback if not available in Indian store)
        if search_term:
            apple_us_cover = await self._query_apple_books(search_term, country="US")
            if apple_us_cover and self._is_valid_cover_url(apple_us_cover):
                return apple_us_cover

        # 5. Open Library by ISBN (via search.json cover_i)
        if isbn:
            ol_isbn_cover = await self._query_open_library_cover_isbn(isbn)
            if ol_isbn_cover and self._is_valid_cover_url(ol_isbn_cover):
                return ol_isbn_cover

        # 6. Open Library by Title + Author
        if title:
            ol_title_cover = await self._query_open_library_cover_title_author(title, author)
            if ol_title_cover and self._is_valid_cover_url(ol_title_cover):
                return ol_title_cover

        # 7. Open Library Direct ISBN jacket URL fallback
        if isbn:
            clean_isbn = isbn.replace("-", "").strip()
            direct_ol = f"https://covers.openlibrary.org/b/isbn/{clean_isbn}-L.jpg"
            if self._is_valid_cover_url(direct_ol):
                return direct_ol

        return None

    def _is_valid_cover_url(self, url: str) -> bool:
        """1x1 Pixel, Malformed URL, & Dummy Placeholder Guard."""
        if not url or not isinstance(url, str):
            return False
        clean = url.strip().lower()
        if not (clean.startswith("https://") or clean.startswith("http://")):
            return False
        # Known 1x1 transparent/blank placeholders
        invalid_patterns = [
            "data:image",
            "pixel.gif",
            "1x1",
            "blank.gif",
            "spacer.gif",
            "placeholder",
            "default_cover",
            "no_cover",
        ]
        if any(pat in clean for pat in invalid_patterns):
            return False
        return True

    async def _query_google_books_isbn(self, isbn: str) -> Optional[str]:
        clean_isbn = isbn.replace("-", "").strip()
        url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{clean_isbn}&maxResults=1"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
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
            logger.debug(f"Google Books ISBN cover query error for {isbn}: {e}")
        return None

    async def _query_google_books_title_author(self, title: str, author: str) -> Optional[str]:
        q_parts = [f"intitle:{title}"]
        if author:
            primary_author = author.split(",")[0].strip()
            q_parts.append(f"inauthor:{primary_author}")
        q = " ".join(q_parts)
        url = "https://www.googleapis.com/books/v1/volumes"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                res = await client.get(url, params={"q": q, "maxResults": 1})
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
            logger.debug(f"Google Books title/author cover query error for {title}: {e}")
        return None

    async def _query_apple_books(self, query: str, country: str = "IN") -> Optional[str]:
        """Queries Apple Books (iTunes Search API) with country code and upscales artwork."""
        url = "https://itunes.apple.com/search"
        params = {
            "term": query,
            "country": country,
            "media": "ebook",
            "entity": "ebook",
            "limit": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
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
                    # Apple artwork can be upscaled from 100x100bb to 600x600bb
                    return artwork.replace("100x100bb", "600x600bb")
        except Exception as e:
            logger.debug(f"Apple Books ({country}) cover query error for {query}: {e}")
        return None

    async def _query_open_library_cover_isbn(self, isbn: str) -> Optional[str]:
        """Resolves Open Library cover_i attribute by ISBN."""
        clean_isbn = isbn.replace("-", "").strip()
        url = f"https://openlibrary.org/search.json?isbn={clean_isbn}&fields=cover_i&limit=1"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return None
                data = res.json()
                docs = data.get("docs", [])
                if docs and docs[0].get("cover_i"):
                    cover_id = docs[0]["cover_i"]
                    return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
        except Exception as e:
            logger.debug(f"Open Library ISBN cover query error for {isbn}: {e}")
        return None

    async def _query_open_library_cover_title_author(self, title: str, author: str) -> Optional[str]:
        """Resolves Open Library cover_i attribute by Title & Author."""
        params = {"title": title, "fields": "cover_i", "limit": 1}
        if author:
            params["author"] = author.split(",")[0].strip()
        url = "https://openlibrary.org/search.json"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                res = await client.get(url, params=params)
                if res.status_code != 200:
                    return None
                data = res.json()
                docs = data.get("docs", [])
                if docs and docs[0].get("cover_i"):
                    cover_id = docs[0]["cover_i"]
                    return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
        except Exception as e:
            logger.debug(f"Open Library title cover query error for {title}: {e}")
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
