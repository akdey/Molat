# backend/tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from app.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.core.security import create_access_token
from app.features.auth.repository import UserRepository
from app.features.books.repository import BookRepository
from app.features.reading.repository import ReadingRepository
from app.features.lending.repository import LendingRepository
from app.features.wishlist.repository import WishlistRepository
from app.features.settings.repository import SettingsRepository


class TestStorageFacade:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserRepository(session)
        self.books = BookRepository(session)
        self.reading = ReadingRepository(session)
        self.lending = LendingRepository(session)
        self.wishlist = WishlistRepository(session)
        self.settings = SettingsRepository(session)


@pytest.fixture(autouse=True)
async def setup_test_db(monkeypatch):
    """Ensure unit tests always run using fresh in-memory SQLite database."""
    monkeypatch.setattr(settings, "DATABASE_URL", None)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", None)

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )

    # Pre-populate test user so foreign keys work seamlessly
    async with session_factory() as session:
        user_repo = UserRepository(session)
        await user_repo.create(
            user_id="usr_test",
            email="seeded_test_runner@example.com",
            username="seeded_test_runner",
            password_hash="hashed",
            role="reader",
        )
        await user_repo.create(
            user_id="owner",
            email="owner@example.com",
            username="owner",
            password_hash="hashed",
            role="admin",
        )

        app.state.storage = TestStorageFacade(session)

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        yield session

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
def db_session(setup_test_db):
    return setup_test_db


@pytest.fixture
def auth_headers():
    token = create_access_token("reader_test", user_id="usr_test", role="reader")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token("admin", user_id="usr_admin", role="admin")
    return {"Authorization": f"Bearer {token}"}
