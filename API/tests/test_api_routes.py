import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "version" in data


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "sheets_connected" in data


def test_list_books_endpoint():
    res = client.get("/books")
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    assert len(body["data"]) > 0


def test_create_and_delete_book():
    new_book = {
        "title": "API Test Book",
        "author": "API Tester",
        "isbn_13": "9781111111111",
        "ownership_status": "Owned",
        "reading_status": "Reading",
        "current_page": 50,
        "total_pages": 300,
    }
    # Create
    create_res = client.post("/books", json=new_book)
    assert create_res.status_code == 201
    created = create_res.json()
    book_id = created["book_id"]
    assert created["title"] == "API Test Book"

    # Get
    get_res = client.get(f"/books/{book_id}")
    assert get_res.status_code == 200
    assert get_res.json()["author"] == "API Tester"

    # Patch
    patch_res = client.patch(f"/books/{book_id}", json={"reading_status": "Completed"})
    assert patch_res.status_code == 200
    assert patch_res.json()["reading_status"] == "Completed"

    # Delete
    del_res = client.delete(f"/books/{book_id}")
    assert del_res.status_code == 204

    # Confirm 404
    get_again = client.get(f"/books/{book_id}")
    assert get_again.status_code == 404


def test_export_endpoints():
    csv_res = client.get("/export/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Book_ID,Title" in csv_res.text

    json_res = client.get("/export/json")
    assert json_res.status_code == 200
    data = json_res.json()
    assert data["format"] == "molat_library_backup"
    assert "books" in data

