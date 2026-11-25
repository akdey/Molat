# backend/app/features/auth/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.auth.repository import UserRepository


async def get_user_repository(session: AsyncSession = Depends(get_db)) -> UserRepository:
    """FastAPI dependency injecting the UserRepository with the request's database session."""
    return UserRepository(session)
