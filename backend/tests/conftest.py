# backend/tests/conftest.py
import pytest
from app.config import settings
from app.main import app
from app.storage.memory import MemoryStorageFactory


@pytest.fixture(autouse=True)
def mock_storage_env(monkeypatch):
    """Ensure unit tests always run using fresh in-memory storage."""
    monkeypatch.setattr(settings, "DATABASE_URL", None)
    monkeypatch.setattr(settings, "GOOGLE_SHEETS_BRIDGE_URL", None)
    monkeypatch.setattr(settings, "BRIDGE_TOKEN", None)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)
    monkeypatch.setattr(settings, "LIBRARY_KEY", "development-secret-key-change-in-production")
    # Fresh in-memory storage factory for every test
    app.state.storage = MemoryStorageFactory()
