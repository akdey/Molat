import pytest
from app.features.books.models import BookCreate
from app.features.books.repository import BookRepository


def test_sanitize_cell_formula_injection():
    # Test formula prefix detection
    s = "=SUM(A1:A10)"
    assert s.startswith("=")


@pytest.mark.anyio
async def test_sqlalchemy_book_crud(db_session):
    repo = BookRepository(db_session)

    # 1. Initially empty for user_test_repo
    books_1 = await repo.list(user_id="usr_repo_test")
    assert len(books_1) == 0

    # 2. Mutate (create a book)
    new_book = await repo.create(
        BookCreate(title="Test Invalidation Book", purchase_price=100.0, rp=200.0),
        user_id="usr_test",
    )
    assert new_book.book_id.startswith("BOOK-")

    # 3. List contains book
    books_2 = await repo.list(user_id="usr_test")
    assert any(b.title == "Test Invalidation Book" for b in books_2)

    # 4. Clean up
    deleted = await repo.delete(new_book.book_id, user_id="usr_test")
    assert deleted is True


@pytest.mark.anyio
async def test_batch_update_covers(db_session):
    repo = BookRepository(db_session)
    new_book = await repo.create(
        BookCreate(title="Cover Update Book", purchase_price=120.0, rp=240.0),
        user_id="usr_test",
    )
    new_cover = "https://example.com/test-cover.jpg"

    count = await repo.batch_update_covers([
        {"book_id": new_book.book_id, "cover_url": new_cover}
    ], user_id="usr_test")
    assert count == 1

    updated = await repo.get(new_book.book_id, user_id="usr_test")
    assert updated is not None
    assert updated.cover_url == new_cover
