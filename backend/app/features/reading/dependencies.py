# backend/app/features/reading/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.reading.repository import ReadingRepository


async def get_reading_repository(session: AsyncSession = Depends(get_db)) -> ReadingRepository:
    """FastAPI dependency injecting the ReadingRepository with the request's database session."""
    return ReadingRepository(session)
