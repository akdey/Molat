# backend/app/core/database.py
import logging
import os
from typing import Optional
from urllib.parse import urlparse, unquote
import asyncpg
from app.config import settings

logger = logging.getLogger("molat.database")
SCHEMA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "schema.sql")


class DatabaseManager:
    """Manages the asyncpg connection pool and schema migrations."""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    @property
    def is_connected(self) -> bool:
        return self.pool is not None

    async def init_pool(self, dsn: str) -> Optional[asyncpg.Pool]:
        if not dsn or "[YOUR-DATABASE-PASSWORD]" in dsn or "[YOUR-PASSWORD]" in dsn:
            logger.info("Database URL placeholder detected or empty. Skipping PostgreSQL connection.")
            return None

        try:
            logger.info("Initializing asyncpg connection pool...")
            u = urlparse(dsn)
            user = unquote(u.username or "")
            password = unquote(u.password or "")
            database = unquote(u.path.lstrip("/") or "postgres")
            host = u.hostname or "localhost"
            port = u.port or 5432

            self.pool = await asyncpg.create_pool(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
                min_size=1,
                max_size=10,
                ssl="require",
                command_timeout=30.0,
                statement_cache_size=0,
            )
            # Auto-run schema migrations
            if os.path.exists(SCHEMA_FILE):
                with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
                    schema_sql = f.read()
                async with self.pool.acquire() as conn:
                    await conn.execute(schema_sql)
                logger.info("PostgreSQL schema initialized and verified.")
            return self.pool
        except Exception as e:
            logger.error(f"Could not connect to PostgreSQL: {e}", exc_info=True)
            self.pool = None
            return None

    async def close_pool(self) -> None:
        if self.pool:
            logger.info("Closing asyncpg connection pool...")
            await self.pool.close()
            self.pool = None


db_manager = DatabaseManager()
