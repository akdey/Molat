# backend/app/features/books/entity.py
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.features.categories.entity import CategoryEntity


class BookEntity(Base):
    __tablename__ = "books"

    book_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    subtitle: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    authors: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, index=True)
    isbn_10: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    isbn_13: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    publisher: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    publication_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(100), default="English")
    genre: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    cover_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reading_status: Mapped[str] = mapped_column(String(50), default="UNREAD", index=True)
    condition: Mapped[str] = mapped_column(String(50), default="Good")
    location: Mapped[Optional[str]] = mapped_column(String(200), default="Home Shelf")
    purchase_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    rp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    purchase_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    updated_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    categories: Mapped[List["CategoryEntity"]] = relationship(
        "CategoryEntity", secondary="book_categories", back_populates="books", lazy="selectin"
    )
