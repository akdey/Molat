# backend/app/features/wishlist/entity.py
from typing import Optional
from sqlalchemy import String, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class WishlistEntity(Base):
    __tablename__ = "wishlist"

    wishlist_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authors: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    isbn_13: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    expected_rp: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    target_price: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(50), default="MEDIUM")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
