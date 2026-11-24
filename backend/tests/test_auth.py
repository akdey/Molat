import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.core.security import create_access_token, verify_access_token, hash_password, verify_password

client = TestClient(app)


def test_password_hashing():
    pw = "SuperSecret123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_auth_signup_and_dual_login():
    # 1. Successful Signup
    signup_payload = {
        "email": "reader_test@example.com",
        "username": "reader_hero",
        "password": "strongPassword99",
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert "access_token" not in signup_data
    assert signup_data["email"] == "reader_test@example.com"
    assert signup_data["username"] == "reader_hero"
    assert signup_data["role"] == "reader"
    assert "Authorization" in signup_res.headers or "x-auth-token" in signup_res.headers
    raw_auth = signup_res.headers.get("authorization", "")
    token = signup_res.headers.get("x-auth-token") or raw_auth.replace("Bearer ", "").strip()

    # 2. Check /api/v1/auth/me with Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "reader_hero"
    assert me_data["email"] == "reader_test@example.com"
    assert me_data["role"] == "reader"

    # 3. Duplicate email signup -> 400 Bad Request
    dup_email_payload = {
        "email": "reader_test@example.com",
        "username": "another_hero",
        "password": "strongPassword99",
    }
    dup_email_res = client.post("/api/v1/auth/signup", json=dup_email_payload)
    assert dup_email_res.status_code == 400
    assert "email already exists" in dup_email_res.json()["detail"].lower()

    # 4. Duplicate username signup -> 400 Bad Request
    dup_user_payload = {
        "email": "another_email@example.com",
        "username": "reader_hero",
        "password": "strongPassword99",
    }
    dup_user_res = client.post("/api/v1/auth/signup", json=dup_user_payload)
    assert dup_user_res.status_code == 400
    assert "username is already taken" in dup_user_res.json()["detail"].lower()

    # 5. Login via Email
    login_by_email = client.post(
        "/api/v1/auth/login",
        json={"identifier": "reader_test@example.com", "password": "strongPassword99"},
    )
    assert login_by_email.status_code == 200
    assert "Authorization" in login_by_email.headers or "x-auth-token" in login_by_email.headers
    assert "access_token" not in login_by_email.json()
    assert login_by_email.json()["username"] == "reader_hero"

    # 6. Login via Username
    login_by_username = client.post(
        "/api/v1/auth/login",
        json={"identifier": "reader_hero", "password": "strongPassword99"},
    )
    assert login_by_username.status_code == 200
    assert "Authorization" in login_by_username.headers or "x-auth-token" in login_by_username.headers
    assert "access_token" not in login_by_username.json()
    assert login_by_username.json()["email"] == "reader_test@example.com"


def test_auth_legacy_login_and_token_usage(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "amit")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "secret123")
    monkeypatch.setattr(settings, "JWT_SECRET", "test-jwt-secret")

    # 1. Successful legacy login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "amit", "password": "secret123"},
    )
    assert login_res.status_code == 200
    assert "Authorization" in login_res.headers or "x-auth-token" in login_res.headers
    data = login_res.json()
    assert "access_token" not in data
    assert data["username"] == "amit"

    raw_auth = login_res.headers.get("authorization", "")
    token = login_res.headers.get("x-auth-token") or raw_auth.replace("Bearer ", "").strip()
    assert len(token.split(".")) == 3

    # 2. Use token on protected write endpoint
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
        json={"identifier": "amit", "password": "wrongpassword"},
    )
    assert res_bad_pass.status_code == 401

    # Wrong username
    res_bad_user = client.post(
        "/api/v1/auth/login",
        json={"identifier": "nonexistent_reader", "password": "secret123"},
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
