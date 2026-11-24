# backend/tests/test_middleware.py
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


def test_rbac_middleware_public_routes():
    """Verify that guest routes are accessible without any credentials."""
    res_root = client.get("/")
    assert res_root.status_code == 200

    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"


def test_rbac_middleware_authentication_enforcement():
    """Verify unauthenticated requests to reader endpoints are rejected with 401."""
    # 1. Missing Authorization header -> 401
    res_unauth = client.get("/api/v1/books")
    assert res_unauth.status_code == 401
    assert "Authentication required" in res_unauth.json()["detail"]

    # 2. Invalid/tampered Bearer token -> 401
    res_invalid = client.get(
        "/api/v1/books",
        headers={"Authorization": "Bearer invalid.fake.token"},
    )
    assert res_invalid.status_code == 401

    # 3. Valid reader token -> 200
    reader_token = create_access_token("reader_amy", user_id="usr_amy", role="reader")
    res_valid = client.get(
        "/api/v1/books",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert res_valid.status_code == 200


def test_rbac_middleware_admin_route_authorization():
    """Verify admin routes block reader tier with 403 and allow admin tier."""
    reader_token = create_access_token("reader_bob", user_id="usr_bob", role="reader")
    admin_token = create_access_token("admin_boss", user_id="usr_admin", role="admin")

    # 1. Reader role attempting admin route -> 403 Forbidden
    res_forbidden = client.post(
        "/api/v1/books/enrich-covers",
        headers={"Authorization": f"Bearer {reader_token}"},
    )
    assert res_forbidden.status_code == 403
    assert "Access denied" in res_forbidden.json()["detail"]

    # 2. Admin role attempting admin route -> 200 OK
    res_allowed = client.post(
        "/api/v1/books/enrich-covers",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_allowed.status_code == 200
