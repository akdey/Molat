import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.book import BOOKS_SCHEMA_COLUMNS, Book, ReadingStatus, BookCondition

client = TestClient(app)


def test_schema_21_columns():
    assert len(BOOKS_SCHEMA_COLUMNS) == 21
    assert BOOKS_SCHEMA_COLUMNS[0] == "book_id"
    assert BOOKS_SCHEMA_COLUMNS[10] == "cover_url"
    assert BOOKS_SCHEMA_COLUMNS[11] == "reading_status"
    assert BOOKS_SCHEMA_COLUMNS[14] == "purchase_price"
    assert BOOKS_SCHEMA_COLUMNS[15] == "rp"
    assert BOOKS_SCHEMA_COLUMNS[-1] == "updated_at"


def test_root_and_health():
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["port"] == 7860

    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "ok"
    assert data["port"] == 7860
    assert "cache_ttl_seconds" in data


def test_get_books_and_portfolio_stats():
    res = client.get("/api/v1/books")
    assert res.status_code == 200
    body = res.json()
    assert "books" in body
    assert "portfolio" in body

    portfolio = body["portfolio"]
    assert "total_books" in portfolio
    assert "total_cp" in portfolio
    assert "total_rp" in portfolio
    assert "total_saved" in portfolio
    assert "discount_pct" in portfolio
    assert portfolio["total_books"] == len(body["books"])


def test_book_crud_lifecycle():
    # 1. Create a book
    new_book = {
        "title": "Clear and Present Danger",
        "subtitle": "Jack Ryan",
        "authors": "Tom Clancy",
        "isbn_10": "0425122180",
        "isbn_13": "9780425122181",
        "publisher": "Berkley",
        "publication_year": 1989,
        "language": "English",
        "genre": "Techno-Thriller",
        "reading_status": "UNREAD",
        "condition": "Good",
        "location": "Home Shelf",
        "purchase_price": 199.0,
        "rp": 499.0,
        "purchase_date": "2024-01-15",
        "notes": "Acquired in sale",
    }
    auth_headers = {"X-Library-Key": "development-secret-key-change-in-production"}
    create_res = client.post("/api/v1/books", json=new_book, headers=auth_headers)
    assert create_res.status_code == 201
    created = create_res.json()
    book_id = created["book_id"]
    assert book_id.startswith("BOOK-")
    assert created["title"] == "Clear and Present Danger"

    # 2. Get book by id
    get_res = client.get(f"/api/v1/books/{book_id}")
    assert get_res.status_code == 200
    assert get_res.json()["authors"] == "Tom Clancy"

    # 3. Update book
    patch_res = client.patch(
        f"/api/v1/books/{book_id}",
        json={"reading_status": "READING", "rating": 5, "notes": "Reading chapter 3"},
        headers=auth_headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["reading_status"] == "READING"
    assert updated["rating"] == 5
    assert updated["notes"] == "Reading chapter 3"

    # 4. Delete book
    del_res = client.delete(f"/api/v1/books/{book_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # 5. Confirm deletion returns 404
    get_after = client.get(f"/api/v1/books/{book_id}")
    assert get_after.status_code == 404


def test_both_isbn10_and_isbn13_auto_sync():
    """Verify that submitting only ISBN-13 automatically computes ISBN-10, and vice versa."""
    auth_headers = {"X-Library-Key": "development-secret-key-change-in-production"}

    # 1. Provide only ISBN-13 -> should auto-derive ISBN-10
    book_only_13 = {
        "title": "Appointment with Death",
        "authors": "Agatha Christie",
        "isbn_13": "9780007119356",
    }
    res13 = client.post("/api/v1/books", json=book_only_13, headers=auth_headers)
    assert res13.status_code == 201
    created13 = res13.json()
    assert created13["isbn_13"] == "9780007119356"
    assert created13["isbn_10"] == "0007119356"

    # 2. Provide only ISBN-10 -> should auto-derive ISBN-13
    book_only_10 = {
        "title": "Murder on the Orient Express",
        "authors": "Agatha Christie",
        "isbn_10": "0007119356",
    }
    res10 = client.post("/api/v1/books", json=book_only_10, headers=auth_headers)
    assert res10.status_code == 201
    created10 = res10.json()
    assert created10["isbn_10"] == "0007119356"
    assert created10["isbn_13"] == "9780007119356"

    # Cleanup
    client.delete(f"/api/v1/books/{created13['book_id']}", headers=auth_headers)
    client.delete(f"/api/v1/books/{created10['book_id']}", headers=auth_headers)


