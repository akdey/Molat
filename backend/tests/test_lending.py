import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.core.security import create_access_token
from app.features.lending.models import LENDING_COLUMNS, LendingStatus
from app.features.books.models import BookCreate

client = TestClient(app)
AUTH_HEADERS = {"Authorization": f"Bearer {create_access_token('reader_test', user_id='usr_test')}"}
IST = ZoneInfo("Asia/Kolkata")


def test_lending_schema_columns():
    assert len(LENDING_COLUMNS) == 10
    assert LENDING_COLUMNS[0] == "lending_id"
    assert LENDING_COLUMNS[1] == "book_id"
    assert LENDING_COLUMNS[2] == "borrower_name"
    assert LENDING_COLUMNS[3] == "borrower_contact"
    assert LENDING_COLUMNS[4] == "lent_date"
    assert LENDING_COLUMNS[5] == "due_date"
    assert LENDING_COLUMNS[6] == "returned_date"
    assert LENDING_COLUMNS[7] == "status"
    assert LENDING_COLUMNS[8] == "notes"
    assert LENDING_COLUMNS[9] == "created_at"


def test_list_lending_endpoint():
    res = client.get("/api/v1/lending", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


@pytest.mark.anyio
async def test_lend_and_return_book_lifecycle():
    # 1. Create a test book in memory repository
    book = await app.state.storage.books.create(
        BookCreate(
            title="The Hobbit",
            authors="J.R.R. Tolkien",
            location="Home Shelf",
        ),
        user_id="usr_test",
    )
    book_id = book.book_id

    # 2. Try lending without auth -> 401
    lend_payload = {
        "book_id": book_id,
        "borrower_name": "Arun Kumar",
        "borrower_contact": "+919876543210",
        "notes": "Lent for weekend read",
    }
    unauth_res = client.post("/api/v1/lending", json=lend_payload)
    assert unauth_res.status_code == 401

    # 3. Lend with auth -> 201
    auth_res = client.post("/api/v1/lending", json=lend_payload, headers=AUTH_HEADERS)
    assert auth_res.status_code == 201
    lending_record = auth_res.json()
    lending_id = lending_record["lending_id"]

    assert len(lending_id) == 36
    assert lending_record["borrower_name"] == "Arun Kumar"
    assert lending_record["status"] == "ACTIVE"
    assert lending_record["book_id"] == book_id
    assert lending_record["book_title"] == "The Hobbit"

    # Verify book's location was updated in catalogue
    updated_book = await app.state.storage.books.get(book_id, user_id="usr_test")
    assert updated_book is not None
    assert updated_book.location == "Lent to Arun Kumar"

    # 4. Check active lending for this book
    active_res = client.get(f"/api/v1/lending/book/{book_id}", headers=AUTH_HEADERS)
    assert active_res.status_code == 200
    assert active_res.json()["lending_id"] == lending_id

    # 5. Prevent double lending while already lent out -> 400
    double_lend_res = client.post(
        "/api/v1/lending",
        json={
            "book_id": book_id,
            "borrower_name": "Priya",
        },
        headers=AUTH_HEADERS,
    )
    assert double_lend_res.status_code == 400

    # 6. Return book -> 200
    return_res = client.post(
        f"/api/v1/lending/{lending_id}/return",
        json={"return_location": "Living Room Shelf", "notes": "Returned in great condition"},
        headers=AUTH_HEADERS,
    )
    assert return_res.status_code == 200
    returned_record = return_res.json()
    assert returned_record["status"] == "RETURNED"
    assert returned_record["returned_date"] is not None

    # Verify book location is restored
    restored_book = await app.state.storage.books.get(book_id, user_id="usr_test")
    assert restored_book.location == "Living Room Shelf"

    # Verify book is no longer in active lending
    active_after_return = client.get(f"/api/v1/lending/book/{book_id}", headers=AUTH_HEADERS)
    assert active_after_return.status_code == 200
    assert active_after_return.json() is None


@pytest.mark.anyio
async def test_overdue_calculation():
    book = await app.state.storage.books.create(
        BookCreate(title="1984", authors="George Orwell"),
        user_id="usr_test",
    )

    # Yesterday's due date -> should mark is_overdue = True
    yesterday = (datetime.now(IST) - timedelta(days=2)).strftime("%Y-%m-%d")
    overdue_due_date = (datetime.now(IST) - timedelta(days=1)).strftime("%Y-%m-%d")

    res = client.post(
        "/api/v1/lending",
        json={
            "book_id": book.book_id,
            "borrower_name": "Rohit",
            "lent_date": yesterday,
            "due_date": overdue_due_date,
        },
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["is_overdue"] is True
    assert data["days_lent"] >= 2

