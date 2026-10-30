import pytest
from app.repositories.sheets_repository import sanitize_cell_value, sheets_repo
from app.models.book import BookCreate, BookUpdate


def test_sanitize_cell_formula_injection():
    assert sanitize_cell_value("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_cell_value("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_cell_value("-10+5") == "'-10+5"
    assert sanitize_cell_value("@HYPERLINK('http://evil.com')") == "'@HYPERLINK('http://evil.com')"
    assert sanitize_cell_value("\tTabValue") == "'\tTabValue"
    # Normal strings left untouched
    assert sanitize_cell_value("The Fourth Protocol") == "The Fourth Protocol"
    assert sanitize_cell_value(299.0) == 299.0


@pytest.mark.anyio
async def test_repository_cache_and_write_invalidation():
    # 1. Warm cache
    books_1 = await sheets_repo.list_books()
    assert "books:all" in sheets_repo.cache

    # 2. Mutate (create a book)
    new_book = await sheets_repo.create_book(
        BookCreate(title="Test Invalidation Book", purchase_price=100.0, rp=200.0)
    )
    # Cache should be cleared
    assert "books:all" not in sheets_repo.cache

    # 3. Clean up
    await sheets_repo.delete_book(new_book.book_id)
    assert "books:all" not in sheets_repo.cache


@pytest.mark.anyio
async def test_batch_update_covers():
    books = await sheets_repo.list_books()
    first_book = books[0]
    new_cover = "https://example.com/test-cover.jpg"

    count = await sheets_repo.batch_update_covers([
        {"book_id": first_book.book_id, "cover_url": new_cover}
    ])
    assert count == 1

    updated = await sheets_repo.get_book(first_book.book_id)
    assert updated is not None
    assert updated.cover_url == new_cover
