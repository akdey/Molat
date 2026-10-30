import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.models.wishlist import WISHLIST_COLUMNS, WishlistItemCreate, WishlistAcquireRequest
from app.models.book import ReadingStatus, BookCondition
from app.repositories.sheets_repository import sheets_repo

client = TestClient(app)
AUTH_HEADERS = {"X-Library-Key": "test-secret-key"}


def test_wishlist_schema_columns():
    assert len(WISHLIST_COLUMNS) == 10
    assert WISHLIST_COLUMNS[0] == "wishlist_id"
    assert WISHLIST_COLUMNS[1] == "title"
    assert WISHLIST_COLUMNS[5] == "expected_rp"
    assert WISHLIST_COLUMNS[6] == "target_price"
    assert WISHLIST_COLUMNS[7] == "priority"
    assert WISHLIST_COLUMNS[-1] == "created_at"


def test_list_wishlist():
    res = client.get("/api/v1/wishlist")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_add_to_wishlist_auth_required(monkeypatch):
    monkeypatch.setattr(settings, "LIBRARY_KEY", "test-secret-key")

    payload = {
        "title": "Klara and the Sun",
        "authors": "Kazuo Ishiguro",
        "expected_rp": 499.0,
        "target_price": 250.0,
        "priority": "High",
    }
    # Unauthenticated request -> 401
    res = client.post("/api/v1/wishlist", json=payload)
    assert res.status_code == 401

    # Authenticated request -> 201
    res_auth = client.post("/api/v1/wishlist", json=payload, headers=AUTH_HEADERS)
    assert res_auth.status_code == 201
    created = res_auth.json()
    assert created["wishlist_id"].startswith("WISH-")
    assert created["title"] == "Klara and the Sun"
    assert created["priority"] == "High"


@pytest.mark.anyio
async def test_acquire_wishlist_item_lifecycle(monkeypatch):
    monkeypatch.setattr(settings, "LIBRARY_KEY", "test-secret-key")

    # 1. Add item to wishlist
    item_in = WishlistItemCreate(
        title="Never Let Me Go",
        authors="Kazuo Ishiguro",
        isbn_13="9780571224142",
        genre="Dystopian Fiction",
        expected_rp=450.0,
        target_price=220.0,
        priority="High",
        notes="Pre-ordered from bookshop",
    )
    created_wish = await sheets_repo.create_wishlist_item(item_in)
    wish_id = created_wish.wishlist_id

    # 2. Acquire wishlist item with actual purchase price 200.0
    acquire_payload = {
        "purchase_price": 200.0,
        "condition": BookCondition.GOOD.value,
        "location": "Top Shelf",
    }
    res = client.post(
        f"/api/v1/wishlist/{wish_id}/acquire",
        json=acquire_payload,
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 200
    book_data = res.json()

    # 3. Verify newly created book record in Books
    assert book_data["book_id"].startswith("BOOK-")
    assert book_data["title"] == "Never Let Me Go"
    assert book_data["purchase_price"] == 200.0
    assert book_data["rp"] == 450.0
    assert book_data["reading_status"] == ReadingStatus.UNREAD
    assert book_data["condition"] == "Good"
    assert book_data["location"] == "Top Shelf"

    # 4. Verify item was removed from Wishlist
    all_wishlist = await sheets_repo.list_wishlist()
    assert not any(w.wishlist_id == wish_id for w in all_wishlist)


def test_acquire_non_existent_wishlist_item(monkeypatch):
    monkeypatch.setattr(settings, "LIBRARY_KEY", "test-secret-key")
    res = client.post(
        "/api/v1/wishlist/WISH-999999/acquire",
        json={"purchase_price": 100.0},
        headers=AUTH_HEADERS,
    )
    assert res.status_code == 404
