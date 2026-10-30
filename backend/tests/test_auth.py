from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.services.auth import create_access_token, verify_access_token

client = TestClient(app)


def test_auth_login_success_and_token_usage(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "amit")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "secret123")
    monkeypatch.setattr(settings, "JWT_SECRET", "test-jwt-secret")

    # 1. Successful login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "amit", "password": "secret123"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["username"] == "amit"
    assert data["token_type"] == "bearer"

    token = data["access_token"]
    assert len(token.split(".")) == 3

    # 2. Check /api/v1/auth/me with Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["authenticated"] is True
    assert me_res.json()["username"] == "amit"

    # 3. Use token on protected write endpoint
    book_payload = {"title": "Authenticated Novel", "purchase_price": 100.0}
    create_res = client.post(
        "/api/v1/books",
        json=book_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    created_id = create_res.json()["book_id"]

    # Clean up
    del_res = client.delete(
        f"/api/v1/books/{created_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204


def test_auth_login_invalid_credentials(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "amit")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "secret123")

    # Wrong password
    res_bad_pass = client.post(
        "/api/v1/auth/login",
        json={"username": "amit", "password": "wrongpassword"},
    )
    assert res_bad_pass.status_code == 401

    # Wrong username
    res_bad_user = client.post(
        "/api/v1/auth/login",
        json={"username": "stranger", "password": "secret123"},
    )
    assert res_bad_user.status_code == 401


def test_auth_tampered_bearer_token(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "secret123")
    monkeypatch.setattr(settings, "JWT_SECRET", "test-jwt-secret")

    fake_token = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJzdWIiOiAiaGFja2VyIn0.invalid_signature"
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {fake_token}"},
    )
    assert res.status_code == 401
