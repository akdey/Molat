# backend/app/features/reading/entity.py
from typing import Optional
from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ReadingLogEntity(Base):
    __tablename__ = "reading_logs"

    log_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id: Mapped[str] = mapped_column(String(50), ForeignKey("books.book_id", ondelete="CASCADE"), nullable=False, index=True)
    session_date: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    start_page: Mapped[int] = mapped_column(Integer, default=0)
    end_page: Mapped[int] = mapped_column(Integer, default=0)
    pages_read: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    session_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
