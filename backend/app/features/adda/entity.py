# backend/app/features/adda/entity.py
from typing import Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AddaPostEntity(Base):
    __tablename__ = "adda_posts"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    username: Mapped[str] = mapped_column(String(80), nullable=False)
    post_type: Mapped[str] = mapped_column(String(30), nullable=False, default="note", index=True)
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="public", index=True)
    alcove_id: Mapped[Optional[str]] = mapped_column(
        String(50), ForeignKey("alcoves.id", ondelete="SET NULL"), nullable=True, index=True
    )
    book_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    book_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    book_authors: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    book_cover_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    has_spoiler: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[str] = mapped_column(String(50), nullable=False, index=True)


class AddaCommentEntity(Base):
    __tablename__ = "adda_comments"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    post_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("adda_posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    username: Mapped[str] = mapped_column(String(80), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)


class AddaReactionEntity(Base):
    __tablename__ = "adda_reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", "reaction_type", name="uq_adda_reaction"),
    )

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    post_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("adda_posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(100), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reaction_type: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[str] = mapped_column(String(50), nullable=False)
