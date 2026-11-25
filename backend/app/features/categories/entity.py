# backend/app/features/categories/entity.py
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.features.books.entity import BookEntity


class CategoryEntity(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    color: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=True)

    books: Mapped[List["BookEntity"]] = relationship(
        "BookEntity", secondary="book_categories", back_populates="categories"
    )


class BookCategoryEntity(Base):
    __tablename__ = "book_categories"

    book_id: Mapped[str] = mapped_column(String(50), ForeignKey("books.book_id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[str] = mapped_column(String(50), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
