import logging
from typing import List, Optional
import httpx
from app.models.metadata import MetadataCandidate

logger = logging.getLogger(__name__)


class MetadataService:
    def __init__(self, timeout: float = 8.0):
        self.timeout = timeout

    async def lookup_isbn(self, isbn: str) -> Optional[MetadataCandidate]:
        """Looks up book metadata by ISBN from Open Library first, then Google Books."""
        clean_isbn = isbn.replace("-", "").replace(" ", "").strip()
        if not clean_isbn:
            return None

        # 1. Try Open Library
        candidate = await self._lookup_open_library_isbn(clean_isbn)
        if candidate:
            return candidate

        # 2. Try Google Books
        return await self._lookup_google_books_isbn(clean_isbn)

    async def search(self, query: str) -> List[MetadataCandidate]:
        """Searches for metadata candidates by title or author."""
        clean_q = query.strip()
        if not clean_q:
            return []

        results: List[MetadataCandidate] = []

        # Try Google Books search
        try:
            gb_results = await self._search_google_books(clean_q)
            results.extend(gb_results)
        except Exception as e:
            logger.warning(f"Google Books search error: {e}")

        # If few results, supplement with Open Library
        if len(results) < 3:
            try:
                ol_results = await self._search_open_library(clean_q)
                results.extend(ol_results)
            except Exception as e:
                logger.warning(f"Open Library search error: {e}")

        return results[:10]

    async def _lookup_open_library_isbn(self, isbn: str) -> Optional[MetadataCandidate]:
        url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    return None
                data = res.json()
                key = f"ISBN:{isbn}"
                if key not in data:
                    return None

                item = data[key]
                authors = ", ".join([a.get("name", "") for a in item.get("authors", [])]) or None
                publishers = ", ".join([p.get("name", "") for p in item.get("publishers", [])]) or None
                publish_date = item.get("publish_date", "")
                year = None
                for token in publish_date.split():
                    if token.isdigit() and len(token) == 4:
                        year = int(token)
                        break

                cover = item.get("cover", {})
                cover_url = cover.get("large") or cover.get("medium") or cover.get("small")

                return MetadataCandidate(
                    title=item.get("title", ""),
                    subtitle=item.get("subtitle"),
                    author=authors,
                    isbn_13=isbn if len(isbn) == 13 else None,
                    isbn_10=isbn if len(isbn) == 10 else None,
                    publisher=publishers,
                    publication_year=year,
                    total_pages=item.get("number_of_pages"),
                    cover_url=cover_url,
                    cover_source="Open Library",
                    source="Open Library",
                    confidence="exact",
                )
        except Exception as e:
            logger.warning(f"Open Library lookup failed: {e}")
            return None

    async def _lookup_google_books_isbn(self, isbn: str) -> Optional[MetadataCandidate]:
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

                info = items[0].get("volumeInfo", {})
                return self._parse_google_books_item(info, confidence="exact")
        except Exception as e:
            logger.warning(f"Google Books ISBN lookup failed: {e}")
            return None

    async def _search_google_books(self, query: str) -> List[MetadataCandidate]:
        url = f"https://www.googleapis.com/books/v1/volumes?q={httpx.URL('', params={'q': query}).params['q']}&maxResults=5"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return []
            data = res.json()
            items = data.get("items", [])
            results = []
            for item in items:
                info = item.get("volumeInfo", {})
                candidate = self._parse_google_books_item(info, confidence="partial")
                if candidate:
                    results.append(candidate)
            return results

    async def _search_open_library(self, query: str) -> List[MetadataCandidate]:
        url = f"https://openlibrary.org/search.json?q={httpx.URL('', params={'q': query}).params['q']}&limit=5"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return []
            data = res.json()
            docs = data.get("docs", [])
            results = []
            for doc in docs:
                title = doc.get("title")
                if not title:
                    continue
                authors = ", ".join(doc.get("author_name", [])) or None
                year = doc.get("first_publish_year")
                isbns = doc.get("isbn", [])
                isbn_13 = next((i for i in isbns if len(i) == 13), None)
                isbn_10 = next((i for i in isbns if len(i) == 10), None)
                cover_id = doc.get("cover_i")
                cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None

                results.append(
                    MetadataCandidate(
                        title=title,
                        author=authors,
                        isbn_13=isbn_13,
                        isbn_10=isbn_10,
                        publication_year=year,
                        cover_url=cover_url,
                        cover_source="Open Library",
                        source="Open Library",
                        confidence="partial",
                    )
                )
            return results

    def _parse_google_books_item(self, info: dict, confidence: str) -> Optional[MetadataCandidate]:
        title = info.get("title")
        if not title:
            return None

        authors = ", ".join(info.get("authors", [])) or None
        published_date = info.get("publishedDate", "")
        year = None
        if published_date and len(published_date) >= 4 and published_date[:4].isdigit():
            year = int(published_date[:4])

        identifiers = info.get("industryIdentifiers", [])
        isbn_13 = None
        isbn_10 = None
        for ident in identifiers:
            t = ident.get("type")
            val = ident.get("identifier")
            if t == "ISBN_13":
                isbn_13 = val
            elif t == "ISBN_10":
                isbn_10 = val

        images = info.get("imageLinks", {})
        cover_url = images.get("thumbnail") or images.get("smallThumbnail")
        if cover_url and cover_url.startswith("http://"):
            cover_url = "https://" + cover_url[7:]

        categories = info.get("categories", [])
        genre = categories[0] if categories else None

        return MetadataCandidate(
            title=title,
            subtitle=info.get("subtitle"),
            author=authors,
            isbn_13=isbn_13,
            isbn_10=isbn_10,
            publisher=info.get("publisher"),
            publication_year=year,
            language=info.get("language"),
            genre=genre,
            total_pages=info.get("pageCount"),
            cover_url=cover_url,
            cover_source="Google Books",
            source="Google Books",
            confidence=confidence,
        )


metadata_service = MetadataService()

