# backend/app/features/wishlist/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.wishlist.repository import WishlistRepository


async def get_wishlist_repository(session: AsyncSession = Depends(get_db)) -> WishlistRepository:
    """FastAPI dependency injecting the WishlistRepository with the request's database session."""
    return WishlistRepository(session)
