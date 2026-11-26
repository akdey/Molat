# backend/app/features/alcoves/entity.py
from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AlcoveEntity(Base):
    __tablename__ = "alcoves"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    invite_code: Mapped[str] = mapped_column(String(24), unique=True, nullable=False, index=True)
    created_by: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)


class AlcoveMemberEntity(Base):
    __tablename__ = "alcove_members"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    alcove_id: Mapped[str] = mapped_column(String(50), ForeignKey("alcoves.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(30), nullable=False, default="member")
    auto_share: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    joined_at: Mapped[str] = mapped_column(String(50), nullable=False)


class AlcoveInviteEntity(Base):
    __tablename__ = "alcove_invites"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    alcove_id: Mapped[str] = mapped_column(String(50), ForeignKey("alcoves.id", ondelete="CASCADE"), nullable=False, index=True)
    invited_by_user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invitee_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    invite_code: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING")
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)


class UserBookStateEntity(Base):
    """Per-reader personal reading state on any shared Alcove book."""

    __tablename__ = "user_book_states"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    book_id: Mapped[str] = mapped_column(String(50), ForeignKey("books.book_id", ondelete="CASCADE"), nullable=False, index=True)
    reading_status: Mapped[str] = mapped_column(String(50), nullable=False, default="UNREAD")
    current_page: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
