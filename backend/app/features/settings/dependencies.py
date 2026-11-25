# backend/app/features/settings/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.settings.repository import SettingsRepository


async def get_settings_repository(session: AsyncSession = Depends(get_db)) -> SettingsRepository:
    """FastAPI dependency injecting the SettingsRepository with the request's database session."""
    return SettingsRepository(session)
