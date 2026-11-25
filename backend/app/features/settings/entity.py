# backend/app/features/settings/entity.py
from typing import Optional
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class UserSettingsEntity(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    daily_goal_pages: Mapped[int] = mapped_column(Integer, default=15)
    active_book_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    theme: Mapped[str] = mapped_column(String(50), default="light")
    updated_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
