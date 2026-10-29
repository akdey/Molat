import pytest
from app.models.book import BookCreate, BookUpdate
from app.services.sheets_service import sheets_service


@pytest.mark.anyio
async def test_sheets_service_crud_fallback():
    # 1. List
    books = await sheets_service.list_books()
    initial_count = len(books)
    assert initial_count > 0

    # 2. Create
    new_book_data = BookCreate(
        title="Test Integration Book",
        author="Tester",
        isbn_13="9780123456789",
        purchase_price=450.0,
    )
    created = await sheets_service.create_book(new_book_data)
    assert created.book_id.startswith("bk_")
    assert created.title == "Test Integration Book"

    # Verify count increased
    books_after_create = await sheets_service.list_books()
    assert len(books_after_create) == initial_count + 1

    # 3. Read single
    fetched = await sheets_service.get_book(created.book_id)
    assert fetched is not None
    assert fetched.author == "Tester"

    # 4. Update
    updated = await sheets_service.update_book(
        created.book_id,
        BookUpdate(title="Test Integration Book - Edited", current_page=120),
    )
    assert updated is not None
    assert updated.title == "Test Integration Book - Edited"
    assert updated.current_page == 120
    assert updated.row_version == 2

    # 5. Delete
    deleted = await sheets_service.delete_book(created.book_id)
    assert deleted is True

    # Verify not found
    not_found = await sheets_service.get_book(created.book_id)
    assert not_found is None
