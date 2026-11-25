# backend/app/storage/provider.py
import logging
from fastapi import Request
from app.config import settings
from app.core.database import db_manager
from app.storage.base import StorageFactory
from app.storage.postgres import PostgresStorageFactory

logger = logging.getLogger("molat.storage")


async def init_storage(app_state) -> StorageFactory:
    """
    Initializes the concrete StorageFactory inside the active running asyncio event loop.
    Ensures asyncpg connection pool is bound to Uvicorn's event loop.
    """
    if hasattr(app_state, "storage") and app_state.storage is not None:
        return app_state.storage

    if not settings.DATABASE_URL or "[YOUR-DATABASE-PASSWORD]" in settings.DATABASE_URL:
        logger.error("FATAL: DATABASE_URL is not configured.")
        raise RuntimeError("DATABASE_URL is required to start Molat. PostgreSQL is the sole relational data engine.")

    pool = await db_manager.init_pool(settings.DATABASE_URL)
    if not pool:
        logger.error("FATAL: PostgreSQL connection pool failed to initialize.")
        raise RuntimeError("PostgreSQL connection pool failed to initialize. Check DATABASE_URL and database availability.")

    app_state.storage = PostgresStorageFactory(pool)
    print("\n" + "=" * 50)
    print(">>> [STORAGE ENGINE]: PostgreSQL (Relational)")
    print("=" * 50 + "\n", flush=True)
    logger.info("Storage destination: PostgreSQL (Relational)")
    return app_state.storage


async def get_storage(request: Request) -> StorageFactory:
    """FastAPI dependency resolving the active storage engine from application state."""
    if not hasattr(request.app.state, "storage") or request.app.state.storage is None:
        return await init_storage(request.app.state)
    return request.app.state.storage
