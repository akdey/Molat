# backend/app/features/genres/entity.py
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class GenreEntity(Base):
    __tablename__ = "genres"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    color: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=True)


class BookGenreEntity(Base):
    __tablename__ = "book_genres"

    book_id: Mapped[str] = mapped_column(String(50), ForeignKey("books.book_id", ondelete="CASCADE"), primary_key=True)
    genre_id: Mapped[str] = mapped_column(String(50), ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True)
