# backend/app/features/genres/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.genres.repository import GenreRepository


async def get_genre_repo(
    session: AsyncSession = Depends(get_db)
) -> GenreRepository:
    return GenreRepository(session)
