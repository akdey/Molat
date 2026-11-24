# backend/app/storage/provider.py
import logging
from fastapi import Request
from app.config import settings
from app.core.database import db_manager
from app.storage.base import StorageFactory
from app.storage.postgres import PostgresStorageFactory
from app.storage.sheets import SheetsStorageFactory
from app.storage.memory import MemoryStorageFactory

logger = logging.getLogger("molat.storage")


async def init_storage(app_state) -> StorageFactory:
    """
    Initializes the concrete StorageFactory inside the active running asyncio event loop.
    Ensures asyncpg connection pool is bound to Uvicorn's event loop.
    """
    if hasattr(app_state, "storage") and app_state.storage is not None:
        return app_state.storage

    if settings.DATABASE_URL and "[YOUR-DATABASE-PASSWORD]" not in settings.DATABASE_URL:
        pool = await db_manager.init_pool(settings.DATABASE_URL)
        if pool:
            app_state.storage = PostgresStorageFactory(pool)
            print("\n" + "=" * 50)
            print(">>> [STORAGE DESTINATION]: DB")
            print("=" * 50 + "\n", flush=True)
            logger.info("Storage destination: DB")
            return app_state.storage
        elif settings.GOOGLE_SHEETS_BRIDGE_URL:
            app_state.storage = SheetsStorageFactory(settings.GOOGLE_SHEETS_BRIDGE_URL, settings.BRIDGE_TOKEN)
            print("\n" + "=" * 50)
            print(">>> [STORAGE DESTINATION]: SHEET (DB failed, fell back to Sheet)")
            print("=" * 50 + "\n", flush=True)
            logger.info("Storage destination: SHEET (fallback from DB)")
            return app_state.storage
        else:
            app_state.storage = MemoryStorageFactory()
            print("\n" + "=" * 50)
            print(">>> [STORAGE DESTINATION]: LOCALDB (DB connection failed)")
            print("=" * 50 + "\n", flush=True)
            logger.info("Storage destination: LOCALDB")
            return app_state.storage

    if settings.GOOGLE_SHEETS_BRIDGE_URL:
        app_state.storage = SheetsStorageFactory(settings.GOOGLE_SHEETS_BRIDGE_URL, settings.BRIDGE_TOKEN)
        print("\n" + "=" * 50)
        print(">>> [STORAGE DESTINATION]: SHEET")
        print("=" * 50 + "\n", flush=True)
        logger.info("Storage destination: SHEET")
        return app_state.storage

    app_state.storage = MemoryStorageFactory()
    print("\n" + "=" * 50)
    print(">>> [STORAGE DESTINATION]: LOCALDB")
    print("=" * 50 + "\n", flush=True)
    logger.info("Storage destination: LOCALDB")
    return app_state.storage


async def get_storage(request: Request) -> StorageFactory:
    """FastAPI dependency resolving the active storage engine from application state."""
    if not hasattr(request.app.state, "storage") or request.app.state.storage is None:
        return await init_storage(request.app.state)
    return request.app.state.storage
