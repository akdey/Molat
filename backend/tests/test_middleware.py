from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def test_library_key_middleware_enforcement(monkeypatch):
    monkeypatch.setattr(settings, "LIBRARY_KEY", "secret-test-key")

    payload = {"title": "Auth Protected Book", "purchase_price": 50.0}

    # 1. Missing header -> 401
    res_missing = client.post("/api/v1/books", json=payload)
    assert res_missing.status_code == 401

    # 2. Invalid header -> 403
    res_invalid = client.post(
        "/api/v1/books", json=payload, headers={"X-Library-Key": "wrong-key"}
    )
    assert res_invalid.status_code == 403

    # 3. Valid header -> 201
    res_valid = client.post(
        "/api/v1/books", json=payload, headers={"X-Library-Key": "secret-test-key"}
    )
    assert res_valid.status_code == 201
    created_id = res_valid.json()["book_id"]

    # Clean up with key
    del_res = client.delete(
        f"/api/v1/books/{created_id}", headers={"X-Library-Key": "secret-test-key"}
    )
    assert del_res.status_code == 204
