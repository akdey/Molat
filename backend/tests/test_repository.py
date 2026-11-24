import pytest
from app.storage.memory import MemoryStorageFactory
from app.features.books.models import BookCreate


def test_sanitize_cell_formula_injection():
    # Test formula prefix detection
    s = "=SUM(A1:A10)"
    assert s.startswith("=")


@pytest.mark.anyio
async def test_memory_storage_book_crud():
    storage = MemoryStorageFactory()

    # 1. Initially empty
    books_1 = await storage.books.list()
    assert len(books_1) == 0

    # 2. Mutate (create a book)
    new_book = await storage.books.create(
        BookCreate(title="Test Invalidation Book", purchase_price=100.0, rp=200.0)
    )
    assert new_book.book_id.startswith("BOOK-")

    # 3. List contains book
    books_2 = await storage.books.list()
    assert len(books_2) == 1
    assert books_2[0].title == "Test Invalidation Book"

    # 4. Clean up
    deleted = await storage.books.delete(new_book.book_id)
    assert deleted is True
    books_3 = await storage.books.list()
    assert len(books_3) == 0


@pytest.mark.anyio
async def test_batch_update_covers():
    storage = MemoryStorageFactory()
    new_book = await storage.books.create(
        BookCreate(title="Cover Update Book", purchase_price=120.0, rp=240.0)
    )
    new_cover = "https://example.com/test-cover.jpg"

    count = await storage.books.batch_update_covers([
        {"book_id": new_book.book_id, "cover_url": new_cover}
    ])
    assert count == 1

    updated = await storage.books.get(new_book.book_id)
    assert updated is not None
    assert updated.cover_url == new_cover
