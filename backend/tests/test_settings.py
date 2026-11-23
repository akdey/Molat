import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings


@pytest.mark.asyncio
async def test_get_and_update_settings():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch initial settings
        resp = await client.get("/api/v1/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert "daily_goal_pages" in data
        assert "theme" in data

        # 2. Update settings (requires library key)
        headers = {"X-Library-Key": "development-secret-key-change-in-production"}
        patch_payload = {
            "daily_goal_pages": 12,
            "active_book_id": "BOOK-999",
            "theme": "dark",
        }
        patch_resp = await client.patch("/api/v1/settings", json=patch_payload, headers=headers)
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["daily_goal_pages"] == 12
        assert updated["active_book_id"] == "BOOK-999"
        assert updated["theme"] == "dark"

        # 3. Verify streak summary automatically uses the updated daily goal
        streak_resp = await client.get("/api/v1/reading/streak-summary")
        assert streak_resp.status_code == 200
        streak_data = streak_resp.json()
        assert streak_data["daily_goal_pages"] == 12
