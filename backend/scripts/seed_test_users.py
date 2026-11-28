"""Idempotent script to create 3 verified seed test readers for Alcoves, Notifications & Adda.
Never touches the existing `akdey` user.

Usage:
  cd backend && .venv/bin/python -m scripts.seed_test_users
"""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select

from app.config import settings
from app.core.database import db_manager
from app.features.adda.entity import AddaPostEntity
from app.features.auth.entity import UserEntity
from app.features.auth.security import hash_password

SEED_USERS = [
    {
        "username": "meera",
        "email": "meera.seed@molat.local",
        "password": "TestReader@123",
        "sample_post": {
            "post_type": "quote",
            "book_title": "The Shadow of the Wind",
            "book_authors": "Carlos Ruiz Zafón",
            "page_number": 42,
            "content": "Every book, every volume you see here, has a soul. The soul of the person who wrote it and of those who read it and lived and dreamed with it.",
        },
    },
    {
        "username": "kabir",
        "email": "kabir.seed@molat.local",
        "password": "TestReader@123",
        "sample_post": {
            "post_type": "review",
            "book_title": "Pather Panchali",
            "book_authors": "Bibhutibhushan Bandyopadhyay",
            "page_number": 180,
            "content": "Reading this slowly over monsoon evenings — the attention to small village details feels timeless.",
        },
    },
    {
        "username": "ananya",
        "email": "ananya.seed@molat.local",
        "password": "TestReader@123",
        "sample_post": {
            "post_type": "discussion",
            "book_title": None,
            "book_authors": None,
            "page_number": None,
            "content": "Do you keep a physical commonplace notebook alongside Molat, or log everything straight into your session notes?",
        },
    },
]


async def seed() -> None:
    if not settings.DATABASE_URL:
        print("DATABASE_URL is not configured. Skipping seed.")
        return

    session_factory = await db_manager.init_engine(settings.DATABASE_URL)
    if not session_factory:
        print("Could not initialize database engine.")
        return

    try:
        async with session_factory() as session:
            for item in SEED_USERS:
                uname = item["username"]
                if uname.lower() == "akdey":
                    continue

                existing = (
                    await session.execute(
                        select(UserEntity).where(func.lower(UserEntity.username) == uname.lower())
                    )
                ).scalar_one_or_none()

                if existing:
                    user = existing
                    print(f"Seed user ex/{uname} already exists (id={user.id}); skipping creation.")
                else:
                    user = UserEntity(
                        id=f"usr_{uuid.uuid4().hex[:12]}",
                        email=item["email"],
                        username=uname,
                        password_hash=hash_password(item["password"]),
                        role="reader",
                        email_verified=True,
                    )
                    session.add(user)
                    await session.flush()
                    print(f"Created seed user ex/{uname} (email={item['email']}).")

                existing_post = (
                    await session.execute(
                        select(AddaPostEntity).where(AddaPostEntity.user_id == user.id)
                    )
                ).scalar_one_or_none()

                if not existing_post:
                    sp = item["sample_post"]
                    session.add(
                        AddaPostEntity(
                            id=f"adda_{uuid.uuid4().hex[:12]}",
                            user_id=user.id,
                            username=uname,
                            post_type=sp["post_type"],
                            visibility="public",
                            book_title=sp["book_title"],
                            book_authors=sp["book_authors"],
                            page_number=sp["page_number"],
                            content=sp["content"],
                            has_spoiler=False,
                            created_at=datetime.now(timezone.utc).isoformat(),
                        )
                    )
                    print(f"Added sample Adda post for ex/{uname}.")

            await session.commit()
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(seed())
