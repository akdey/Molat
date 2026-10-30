import pytest
from app.services.cover_enrichment import cover_enricher
from app.models.book import Book


def test_is_valid_cover_url():
    # Valid URLs
    assert cover_enricher._is_valid_cover_url("https://covers.openlibrary.org/b/id/12345-L.jpg")
    assert cover_enricher._is_valid_cover_url("http://books.google.com/books/content?id=xyz")

    # Invalid URLs / 1x1 Pixel guards
    assert not cover_enricher._is_valid_cover_url("")
    assert not cover_enricher._is_valid_cover_url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
    assert not cover_enricher._is_valid_cover_url("https://example.com/1x1.gif")
    assert not cover_enricher._is_valid_cover_url("https://example.com/pixel.gif")
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
