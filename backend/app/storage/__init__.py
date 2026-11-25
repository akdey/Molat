# backend/app/storage/__init__.py
from app.storage.base import StorageFactory
from app.storage.provider import get_storage
from app.storage.postgres import PostgresStorageFactory

__all__ = [
    "StorageFactory",
    "get_storage",
    "PostgresStorageFactory",
]
