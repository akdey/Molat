import pytest
from app.models.book import Book, BookCreate, BookCondition, OwnershipStatus, ReadingStatus, SHEET_COLUMNS


def test_book_sheet_columns_count():
    assert len(SHEET_COLUMNS) == 31
    assert SHEET_COLUMNS[0] == "Book_ID"
    assert SHEET_COLUMNS[1] == "Title"
    assert SHEET_COLUMNS[-1] == "Row_Version"


def test_clean_isbn():
    b = BookCreate(title="Test", isbn_13="978-0-15-600131-1", isbn_10="0 15 600131 4")
    assert b.isbn_13 == "9780156001311"
    assert b.isbn_10 == "0156001314"


def test_invalid_prices():
    with pytest.raises(ValueError):
        BookCreate(title="Test", purchase_price=-10.0)


def test_invalid_rating():
    with pytest.raises(ValueError):
        BookCreate(title="Test", personal_rating=6)


def test_sheet_row_roundtrip():
    original_row = {
        "Book_ID": "bk_test_123",
        "Title": "The Name of the Rose",
        "Subtitle": "A Novel",
        "Author": "Umberto Eco",
        "ISBN_13": "9780156001311",
        "Publisher": "Harcourt",
        "Publication_Year": "1980",
        "Language": "English",
        "Genre": "Historical Fiction",
        "Ownership_Status": "Owned",
        "Reading_Status": "Completed",
        "Current_Page": "502",
        "Total_Pages": "502",
        "Purchase_Price": "699",
        "Retail_Price": "800",
        "Condition": "Good",
        "Shelf_Location": "Fiction A",
        "Personal_Rating": "5",
        "Notes": "Great book",
        "Cover_URL": "https://example.com/cover.jpg",
        "Metadata_Verified": "TRUE",
        "Created_At": "2024-01-15T10:00:00Z",
        "Updated_At": "2024-03-20T08:30:00Z",
        "Row_Version": "1",
    }

    book = Book.from_sheet_row(original_row)
    assert book.book_id == "bk_test_123"
    assert book.title == "The Name of the Rose"
    assert book.current_page == 502
    assert book.purchase_price == 699.0
    assert book.metadata_verified is True

    exported_values = book.to_sheet_row()
    assert len(exported_values) == len(SHEET_COLUMNS)
    assert exported_values[0] == "bk_test_123"
    assert exported_values[1] == "The Name of the Rose"
    assert exported_values[27] == "TRUE"

