# backend/app/features/books/dependencies.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.books.repository import BookRepository


async def get_book_repository(session: AsyncSession = Depends(get_db)) -> BookRepository:
    """FastAPI dependency injecting the BookRepository with the request's database session."""
    return BookRepository(session)
