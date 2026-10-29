import csv
import io
import re
from datetime import datetime
from typing import List, Dict, Any
from app.models.book import Book, SHEET_COLUMNS

# Characters that trigger spreadsheet formula execution
FORMULA_PREFIXES = re.compile(r"^[=+\-@\t\r]")


def sanitize_csv_value(val: Any) -> str:
    """Protects against CSV / Spreadsheet formula injection attacks."""
    if val is None:
        return ""
    s = str(val)
    if FORMULA_PREFIXES.match(s):
        return f"'{s}"
    return s


def export_books_to_csv(books: List[Book]) -> str:
    """Generates sanitized CSV text with standard headers."""
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header
    writer.writerow(SHEET_COLUMNS)

    # Rows
    for book in books:
        raw_row = book.to_sheet_row()
        sanitized = [sanitize_csv_value(v) for v in raw_row]
        writer.writerow(sanitized)

    return output.getvalue()


def export_books_to_json(books: List[Book]) -> Dict[str, Any]:
    """Generates structured JSON backup with schema and metadata."""
    return {
        "format": "molat_library_backup",
        "schema_version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "total_books": len(books),
        "books": [b.model_dump() for b in books],
    }

