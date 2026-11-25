# backend/app/features/lending/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.lending.repository import LendingRepository


async def get_lending_repository(session: AsyncSession = Depends(get_db)) -> LendingRepository:
    """FastAPI dependency injecting the LendingRepository with the request's database session."""
    return LendingRepository(session)
