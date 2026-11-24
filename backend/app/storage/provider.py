# backend/app/storage/provider.py
from fastapi import Request
from app.storage.base import StorageFactory


def get_storage(request: Request) -> StorageFactory:
    """FastAPI dependency resolving the active storage engine from application state."""
    return request.app.state.storage
