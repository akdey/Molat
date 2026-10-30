import pytest
from app.config import settings


@pytest.fixture(autouse=True)
def mock_bridge_env(monkeypatch):
    """Ensure unit tests always run in-memory without making external network calls."""
    monkeypatch.setattr(settings, "GOOGLE_SHEETS_BRIDGE_URL", None)
    monkeypatch.setattr(settings, "BRIDGE_TOKEN", None)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)
    monkeypatch.setattr(settings, "LIBRARY_KEY", "development-secret-key-change-in-production")
