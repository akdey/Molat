# backend/tests/conftest.py
import pytest
from app.config import settings
from app.main import app
from app.storage.memory import MemoryStorageFactory
from app.core.security import create_access_token


@pytest.fixture(autouse=True)
def mock_storage_env(monkeypatch):
    """Ensure unit tests always run using fresh in-memory storage."""
    monkeypatch.setattr(settings, "DATABASE_URL", None)
    monkeypatch.setattr(settings, "GOOGLE_SHEETS_BRIDGE_URL", None)
    monkeypatch.setattr(settings, "BRIDGE_TOKEN", None)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)
    # Fresh in-memory storage factory for every test
    app.state.storage = MemoryStorageFactory()


@pytest.fixture
def auth_headers():
    token = create_access_token("reader_test", user_id="usr_test", role="reader")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token("admin", user_id="usr_admin", role="admin")
    return {"Authorization": f"Bearer {token}"}

