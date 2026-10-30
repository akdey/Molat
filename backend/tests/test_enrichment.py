import pytest
from unittest.mock import AsyncMock, patch
from app.services.cover_enrichment import cover_enricher, CoverEnrichmentService
from app.models.book import Book


def test_is_valid_cover_url():
    # Valid URLs
    assert cover_enricher._is_valid_cover_url("https://covers.openlibrary.org/b/id/12345-L.jpg")
    assert cover_enricher._is_valid_cover_url("http://books.google.com/books/content?id=xyz")
    assert cover_enricher._is_valid_cover_url("https://is1-ssl.mzstatic.com/image/thumb/600x600bb.jpg")

    # Invalid URLs / 1x1 Pixel guards / Placeholders
    assert not cover_enricher._is_valid_cover_url("")
    assert not cover_enricher._is_valid_cover_url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
    assert not cover_enricher._is_valid_cover_url("https://example.com/1x1.gif")
    assert not cover_enricher._is_valid_cover_url("https://example.com/pixel.gif")
    assert not cover_enricher._is_valid_cover_url("https://example.com/placeholder.jpg")
    assert not cover_enricher._is_valid_cover_url("ftp://example.com/image.jpg")


@pytest.mark.anyio
async def test_enrich_missing_covers_flow():
    # Test with books that already have covers vs missing
    book_with_cover = Book(
        book_id="BOOK-999",
        title="Covered Book",
        cover_url="https://covers.openlibrary.org/b/id/111-L.jpg",
        created_at="2024-01-01",
        updated_at="2024-01-01",
    )
    # If all books have covers, returns empty list
    updates = await cover_enricher.enrich_missing_covers([book_with_cover])
    assert updates == []


@pytest.mark.anyio
async def test_waterfall_fallbacks():
    svc = CoverEnrichmentService(timeout=1.0)
    book = Book(
        book_id="BOOK-001",
        title="Mulat Test Book",
        authors="Rabindranath Tagore",
        isbn_13="9780140449136",
        created_at="2024-01-01",
        updated_at="2024-01-01",
    )

    # 1. When Google Books ISBN succeeds
    with patch.object(svc, "_query_google_books_isbn", new_callable=AsyncMock) as m_gb_isbn:
        m_gb_isbn.return_value = "https://books.google.com/isbn-cover.jpg"
        result = await svc.resolve_cover_url(book)
        assert result == "https://books.google.com/isbn-cover.jpg"
        m_gb_isbn.assert_called_once()

    # 2. When Google Books ISBN fails, falls back to Google Books Title + Author
    with patch.object(svc, "_query_google_books_isbn", new_callable=AsyncMock) as m_gb_isbn, \
         patch.object(svc, "_query_google_books_title_author", new_callable=AsyncMock) as m_gb_title:
        m_gb_isbn.return_value = None
        m_gb_title.return_value = "https://books.google.com/title-cover.jpg"
        result = await svc.resolve_cover_url(book)
        assert result == "https://books.google.com/title-cover.jpg"
        m_gb_isbn.assert_called_once()
        m_gb_title.assert_called_once()

    # 3. When both Google Books fail, falls back to Apple Books India
    with patch.object(svc, "_query_google_books_isbn", new_callable=AsyncMock) as m_gb_isbn, \
         patch.object(svc, "_query_google_books_title_author", new_callable=AsyncMock) as m_gb_title, \
         patch.object(svc, "_query_apple_books", new_callable=AsyncMock) as m_apple:
        m_gb_isbn.return_value = None
        m_gb_title.return_value = None
        m_apple.side_effect = ["https://apple.com/in-cover.jpg", None]
        result = await svc.resolve_cover_url(book)
        assert result == "https://apple.com/in-cover.jpg"

    # 4. When Apple India fails, falls back to Apple Books US
    with patch.object(svc, "_query_google_books_isbn", new_callable=AsyncMock) as m_gb_isbn, \
         patch.object(svc, "_query_google_books_title_author", new_callable=AsyncMock) as m_gb_title, \
         patch.object(svc, "_query_apple_books", new_callable=AsyncMock) as m_apple:
        m_gb_isbn.return_value = None
        m_gb_title.return_value = None
        # IN returns None, US returns valid URL
        m_apple.side_effect = [None, "https://apple.com/us-cover.jpg"]
        result = await svc.resolve_cover_url(book)
        assert result == "https://apple.com/us-cover.jpg"

    # 5. When Apple fails, falls back to Open Library ISBN
    with patch.object(svc, "_query_google_books_isbn", new_callable=AsyncMock) as m_gb_isbn, \
         patch.object(svc, "_query_google_books_title_author", new_callable=AsyncMock) as m_gb_title, \
         patch.object(svc, "_query_apple_books", new_callable=AsyncMock) as m_apple, \
         patch.object(svc, "_query_open_library_cover_isbn", new_callable=AsyncMock) as m_ol_isbn:
        m_gb_isbn.return_value = None
        m_gb_title.return_value = None
        m_apple.return_value = None
        m_ol_isbn.return_value = "https://covers.openlibrary.org/b/id/555-L.jpg"
        result = await svc.resolve_cover_url(book)
        assert result == "https://covers.openlibrary.org/b/id/555-L.jpg"

    # 6. When Open Library ISBN fails, falls back to Open Library Title + Author
    with patch.object(svc, "_query_google_books_isbn", new_callable=AsyncMock) as m_gb_isbn, \
         patch.object(svc, "_query_google_books_title_author", new_callable=AsyncMock) as m_gb_title, \
         patch.object(svc, "_query_apple_books", new_callable=AsyncMock) as m_apple, \
         patch.object(svc, "_query_open_library_cover_isbn", new_callable=AsyncMock) as m_ol_isbn, \
         patch.object(svc, "_query_open_library_cover_title_author", new_callable=AsyncMock) as m_ol_title:
        m_gb_isbn.return_value = None
        m_gb_title.return_value = None
        m_apple.return_value = None
        m_ol_isbn.return_value = None
        m_ol_title.return_value = "https://covers.openlibrary.org/b/id/777-L.jpg"
        result = await svc.resolve_cover_url(book)
        assert result == "https://covers.openlibrary.org/b/id/777-L.jpg"
