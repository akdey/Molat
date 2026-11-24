import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.book import BookCreate
from app.models.reading_log import ReadingLogCreate
from app.services.auth import create_access_token

client = TestClient(app)


@pytest.mark.anyio
async def test_multi_user_data_isolation():
    # Token for user A
    token_user_a = create_access_token(username="alice", user_id="user_alice")
    headers_a = {"Authorization": f"Bearer {token_user_a}"}

    # Token for user B
    token_user_b = create_access_token(username="bob", user_id="user_bob")
    headers_b = {"Authorization": f"Bearer {token_user_b}"}

    # 1. User A creates a book
    res_a = client.post(
        "/api/v1/books",
        json={"title": "Alice in Wonderland", "authors": "Lewis Carroll", "purchase_price": 100.0, "rp": 200.0},
        headers=headers_a,
    )
    assert res_a.status_code == 201
    book_a = res_a.json()

    # 2. User B creates a book
    res_b = client.post(
        "/api/v1/books",
        json={"title": "Bob's Adventure", "authors": "Bob Builder", "purchase_price": 50.0, "rp": 100.0},
        headers=headers_b,
    )
    assert res_b.status_code == 201
    book_b = res_b.json()

    # 3. User A lists books -> only sees Alice in Wonderland
    list_a = client.get("/api/v1/books", headers=headers_a)
    assert list_a.status_code == 200
    titles_a = [b["title"] for b in list_a.json()["books"]]
    assert "Alice in Wonderland" in titles_a
    assert "Bob's Adventure" not in titles_a

    # 4. User B lists books -> only sees Bob's Adventure
    list_b = client.get("/api/v1/books", headers=headers_b)
    assert list_b.status_code == 200
    titles_b = [b["title"] for b in list_b.json()["books"]]
    assert "Bob's Adventure" in titles_b
    assert "Alice in Wonderland" not in titles_b

    # 5. User A updates settings (goal: 25 pages)
    patch_a = client.patch("/api/v1/settings", json={"daily_goal_pages": 25}, headers=headers_a)
    assert patch_a.status_code == 200
    assert patch_a.json()["daily_goal_pages"] == 25

    # 6. User B's settings remain untouched (goal: 15 pages default)
    get_b_settings = client.get("/api/v1/settings", headers=headers_b)
    assert get_b_settings.status_code == 200
    assert get_b_settings.json()["daily_goal_pages"] == 15

    # 7. Unauthenticated request accesses public shelf (owner)
    public_res = client.get("/api/v1/books")
    assert public_res.status_code == 200
    public_titles = [b["title"] for b in public_res.json()["books"]]
    # Owner's shelf does not contain alice or bob's books
    assert "Alice in Wonderland" not in public_titles
    assert "Bob's Adventure" not in public_titles
