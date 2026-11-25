# backend/app/features/lending/entity.py
from typing import Optional
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class LendingEntity(Base):
    __tablename__ = "lending"

    lending_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id: Mapped[str] = mapped_column(String(50), ForeignKey("books.book_id", ondelete="CASCADE"), nullable=False, index=True)
    borrower_name: Mapped[str] = mapped_column(String(200), nullable=False)
    borrower_contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lent_date: Mapped[str] = mapped_column(String(50), nullable=False)
    due_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    returned_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
