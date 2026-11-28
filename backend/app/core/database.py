# backend/app/core/database.py
import logging
from typing import AsyncGenerator, Optional
from urllib.parse import urlparse, quote, unquote
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger("molat.database")


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Declarative Base shared across all feature slice entities."""
    pass


def _normalize_database_url(dsn: str) -> str:
    """
    Ensures database DSN uses the asyncpg driver dialect (postgresql+asyncpg://)
    and safely URL-percent-encodes user credentials if special characters (like '@' or ':')
    exist in the username or password without prior encoding.
    """
    clean_dsn = dsn.strip()
    if clean_dsn.startswith("postgresql://"):
        clean_dsn = "postgresql+asyncpg://" + clean_dsn[len("postgresql://"):]
    elif clean_dsn.startswith("postgres://"):
        clean_dsn = "postgresql+asyncpg://" + clean_dsn[len("postgres://"):]

    prefix, sep, rest = clean_dsn.partition("://")
    if not sep:
        return clean_dsn

    # Find the boundary of authority (before / or ?)
    path_start = len(rest)
    for ch in ("/", "?"):
        idx = rest.find(ch)
        if idx != -1 and idx < path_start:
            path_start = idx

    authority = rest[:path_start]
    remainder = rest[path_start:]

    # In authority: user:password@host:port
    # The LAST "@" separates user credentials from host[:port]
    if "@" in authority:
        userinfo, hostport = authority.rsplit("@", 1)
        if ":" in userinfo:
            user, pwd = userinfo.split(":", 1)
            # URL-encode user and password to prevent '@' or ':' in credentials breaking host extraction
            userinfo = f"{quote(unquote(user), safe='')}:{quote(unquote(pwd), safe='')}"
        else:
            userinfo = quote(unquote(userinfo), safe='')
        authority = f"{userinfo}@{hostport}"

    return f"{prefix}://{authority}{remainder}"


class DatabaseManager:
    """Manages the SQLAlchemy 2.0 async engine and session factory."""

    def __init__(self):
        self.engine: Optional[AsyncEngine] = None
        self.session_factory: Optional[async_sessionmaker[AsyncSession]] = None

    @property
    def is_connected(self) -> bool:
        return self.engine is not None and self.session_factory is not None

    async def init_engine(self, dsn: Optional[str]) -> Optional[async_sessionmaker[AsyncSession]]:
        if not dsn or "[YOUR-DATABASE-PASSWORD]" in dsn or "[YOUR-PASSWORD]" in dsn:
            logger.info("Database URL placeholder detected or empty. Skipping database initialization.")
            return None

        try:
            logger.info("Initializing SQLAlchemy 2.0 AsyncEngine...")
            normalized_url = _normalize_database_url(dsn)

            # SSL handling for hosted PostgreSQL (Supabase / AWS / GCP)
            connect_args = {}
            if "supabase" in normalized_url or "ssl" in normalized_url:
                connect_args["ssl"] = "require"

            # Strip any query parameters asyncpg does not natively support
            parsed = urlparse(normalized_url)
            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

            self.engine = create_async_engine(
                clean_url,
                echo=False,
                pool_size=10,
                max_overflow=5,
                pool_pre_ping=True,
                connect_args=connect_args,
            )

            self.session_factory = async_sessionmaker(
                bind=self.engine,
                expire_on_commit=False,
                class_=AsyncSession,
            )

            # Auto-register all slice entity models onto Base.metadata
            import app.features.auth.entity  # noqa
            import app.features.alcoves.entity  # noqa
            import app.features.books.entity  # noqa
            import app.features.genres.entity  # noqa
            import app.features.reading.entity  # noqa
            import app.features.lending.entity  # noqa
            import app.features.wishlist.entity  # noqa
            import app.features.settings.entity  # noqa
            import app.features.notifications.entity  # noqa

            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                # Idempotent column migrations for existing PostgreSQL deployments
                if "postgresql" in clean_url:
                    from sqlalchemy import text
                    migration_statements = [
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE",
                        "ALTER TABLE books ADD COLUMN IF NOT EXISTS alcove_id VARCHAR(50) REFERENCES alcoves(id) ON DELETE SET NULL",
                        "ALTER TABLE books ADD COLUMN IF NOT EXISTS held_by_label VARCHAR(100)",
                        "ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS book_title VARCHAR(500)",
                        "ALTER TABLE reading_logs ALTER COLUMN book_id DROP NOT NULL",
                    ]
                    for sql in migration_statements:
                        await conn.execute(text(sql))

            logger.info("SQLAlchemy 2.0 AsyncEngine and slice entities initialized successfully.")
            return self.session_factory

        except Exception as e:
            logger.error(f"Failed to initialize SQLAlchemy 2.0 engine: {e}", exc_info=True)
            self.engine = None
            self.session_factory = None
            return None

    async def close(self) -> None:
        if self.engine:
            logger.info("Disposing SQLAlchemy AsyncEngine...")
            await self.engine.dispose()
            self.engine = None
            self.session_factory = None


db_manager = DatabaseManager()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an isolated async database session per request."""
    if not db_manager.session_factory:
        raise RuntimeError("Database engine is not initialized. Please verify DATABASE_URL.")
    async with db_manager.session_factory() as session:
        yield session
