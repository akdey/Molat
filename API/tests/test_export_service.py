from app.models.book import Book
from app.services.export_service import sanitize_csv_value, export_books_to_csv, export_books_to_json


def test_sanitize_csv_formula_injection():
    # Vulnerable inputs that could trigger formulas in Excel or Google Sheets
    assert sanitize_csv_value("=1+1") == "'=1+1"
    assert sanitize_csv_value("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_csv_value("-5+5") == "'-5+5"
    assert sanitize_csv_value("@SUM(1,2)") == "'@SUM(1,2)"
    assert sanitize_csv_value("\tTabMalicious") == "'\tTabMalicious"
    # Safe text
    assert sanitize_csv_value("The Name of the Rose") == "The Name of the Rose"
    assert sanitize_csv_value(42) == "42"


def test_export_books_csv_and_json():
    book = Book(
        book_id="bk_001",
        title="=Exploit Title",
        author="Normal Author",
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    )

    csv_text = export_books_to_csv([book])
    assert "'=Exploit Title" in csv_text
    assert "Normal Author" in csv_text

    json_backup = export_books_to_json([book])
    assert json_backup["format"] == "molat_library_backup"
    assert json_backup["total_books"] == 1
    assert json_backup["books"][0]["book_id"] == "bk_001"

