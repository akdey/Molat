# backend/app/features/alcoves/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.alcoves.repository import AlcoveRepository


async def get_alcove_repository(db: AsyncSession = Depends(get_db)) -> AlcoveRepository:
    """FastAPI dependency injecting AlcoveRepository with the request's database session."""
    return AlcoveRepository(db)
