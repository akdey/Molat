# backend/app/features/adda/repository.py
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import Depends
from sqlalchemy import delete, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.adda.entity import AddaCommentEntity, AddaPostEntity, AddaReactionEntity
from app.features.adda.models import (
    AddaCommentResponse,
    AddaFeedResponse,
    AddaPostCreate,
    AddaPostResponse,
)
from app.features.alcoves.entity import AlcoveMemberEntity


class AddaRepository:
    """Async SQLAlchemy 2.0 repository for Adda literary community posts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    async def _get_user_alcove_ids(self, user_id: str) -> List[str]:
        rows = (
            await self.db.execute(
                select(AlcoveMemberEntity.alcove_id).where(AlcoveMemberEntity.user_id == user_id)
            )
        ).scalars().all()
        return list(rows)

    async def list_posts(
        self,
        user_id: str,
        scope: str = "all",
        post_type: Optional[str] = None,
        limit: int = 40,
    ) -> AddaFeedResponse:
        my_alcove_ids = await self._get_user_alcove_ids(user_id)

        stmt = select(AddaPostEntity)
        if scope == "mine":
            stmt = stmt.where(AddaPostEntity.user_id == user_id)
        elif scope == "alcove":
            if not my_alcove_ids:
                return AddaFeedResponse(posts=[])
            stmt = stmt.where(
                AddaPostEntity.visibility == "alcove",
                AddaPostEntity.alcove_id.in_(my_alcove_ids),
            )
        else:
            if my_alcove_ids:
                stmt = stmt.where(
                    or_(
                        AddaPostEntity.visibility == "public",
                        (AddaPostEntity.visibility == "alcove")
                        & (AddaPostEntity.alcove_id.in_(my_alcove_ids)),
                    )
                )
            else:
                stmt = stmt.where(AddaPostEntity.visibility == "public")

        if post_type and post_type != "all":
            stmt = stmt.where(AddaPostEntity.post_type == post_type)

        posts = (
            await self.db.execute(stmt.order_by(desc(AddaPostEntity.created_at)).limit(limit))
        ).scalars().all()

        if not posts:
            return AddaFeedResponse(posts=[])

        post_ids = [p.id for p in posts]
        comments = (
            await self.db.execute(
                select(AddaCommentEntity)
                .where(AddaCommentEntity.post_id.in_(post_ids))
                .order_by(AddaCommentEntity.created_at)
            )
        ).scalars().all()

        reactions = (
            await self.db.execute(
                select(AddaReactionEntity).where(AddaReactionEntity.post_id.in_(post_ids))
            )
        ).scalars().all()

        comments_by_post: Dict[str, List[AddaCommentResponse]] = {}
        for c in comments:
            comments_by_post.setdefault(c.post_id, []).append(
                AddaCommentResponse(
                    id=c.id,
                    post_id=c.post_id,
                    user_id=c.user_id,
                    username=c.username,
                    content=c.content,
                    created_at=c.created_at,
                )
            )

        counts_by_post: Dict[str, Dict[str, int]] = {}
        my_reactions_by_post: Dict[str, List[str]] = {}
        for r in reactions:
            counts = counts_by_post.setdefault(r.post_id, {})
            counts[r.reaction_type] = counts.get(r.reaction_type, 0) + 1
            if r.user_id == user_id:
                my_reactions_by_post.setdefault(r.post_id, []).append(r.reaction_type)

        return AddaFeedResponse(
            posts=[
                AddaPostResponse(
                    id=p.id,
                    user_id=p.user_id,
                    username=p.username,
                    post_type=p.post_type,
                    visibility=p.visibility,
                    alcove_id=p.alcove_id,
                    book_id=p.book_id,
                    book_title=p.book_title,
                    book_authors=p.book_authors,
                    book_cover_url=p.book_cover_url,
                    page_number=p.page_number,
                    content=p.content,
                    has_spoiler=bool(p.has_spoiler),
                    created_at=p.created_at,
                    reaction_counts=counts_by_post.get(p.id, {}),
                    my_reactions=my_reactions_by_post.get(p.id, []),
                    comments=comments_by_post.get(p.id, []),
                )
                for p in posts
            ]
        )

    async def create_post(
        self, user_id: str, username: str, payload: AddaPostCreate
    ) -> AddaPostResponse:
        alcove_id = payload.alcove_id
        if payload.visibility == "alcove":
            my_alcove_ids = await self._get_user_alcove_ids(user_id)
            if not my_alcove_ids:
                raise ValueError("Join or create a Family Alcove before posting to Alcove visibility.")
            if not alcove_id or alcove_id not in my_alcove_ids:
                alcove_id = my_alcove_ids[0]
        else:
            alcove_id = None

        post = AddaPostEntity(
            id=f"adda_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            username=username,
            post_type=payload.post_type,
            visibility=payload.visibility,
            alcove_id=alcove_id,
            book_id=payload.book_id,
            book_title=payload.book_title.strip() if payload.book_title else None,
            book_authors=payload.book_authors.strip() if payload.book_authors else None,
            book_cover_url=payload.book_cover_url,
            page_number=payload.page_number,
            content=payload.content.strip(),
            has_spoiler=payload.has_spoiler,
            created_at=self._now_iso(),
        )
        self.db.add(post)
        await self.db.commit()
        await self.db.refresh(post)
        return AddaPostResponse(
            id=post.id,
            user_id=post.user_id,
            username=post.username,
            post_type=post.post_type,
            visibility=post.visibility,
            alcove_id=post.alcove_id,
            book_id=post.book_id,
            book_title=post.book_title,
            book_authors=post.book_authors,
            book_cover_url=post.book_cover_url,
            page_number=post.page_number,
            content=post.content,
            has_spoiler=bool(post.has_spoiler),
            created_at=post.created_at,
            reaction_counts={},
            my_reactions=[],
            comments=[],
        )

    async def delete_post(self, user_id: str, post_id: str) -> bool:
        res = await self.db.execute(
            delete(AddaPostEntity).where(
                AddaPostEntity.id == post_id,
                AddaPostEntity.user_id == user_id,
            )
        )
        await self.db.commit()
        return (res.rowcount or 0) > 0

    async def add_comment(
        self, user_id: str, username: str, post_id: str, content: str
    ) -> Optional[tuple[AddaPostEntity, AddaCommentResponse]]:
        post = await self.db.get(AddaPostEntity, post_id)
        if not post:
            return None

        comment = AddaCommentEntity(
            id=f"acmt_{uuid.uuid4().hex[:12]}",
            post_id=post_id,
            user_id=user_id,
            username=username,
            content=content.strip(),
            created_at=self._now_iso(),
        )
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        return post, AddaCommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            username=comment.username,
            content=comment.content,
            created_at=comment.created_at,
        )

    async def delete_comment(self, user_id: str, comment_id: str) -> bool:
        res = await self.db.execute(
            delete(AddaCommentEntity).where(
                AddaCommentEntity.id == comment_id,
                AddaCommentEntity.user_id == user_id,
            )
        )
        await self.db.commit()
        return (res.rowcount or 0) > 0

    async def toggle_reaction(
        self, user_id: str, post_id: str, reaction_type: str
    ) -> Optional[tuple[AddaPostEntity, bool]]:
        post = await self.db.get(AddaPostEntity, post_id)
        if not post:
            return None

        existing = (
            await self.db.execute(
                select(AddaReactionEntity).where(
                    AddaReactionEntity.post_id == post_id,
                    AddaReactionEntity.user_id == user_id,
                    AddaReactionEntity.reaction_type == reaction_type,
                )
            )
        ).scalar_one_or_none()

        if existing:
            await self.db.delete(existing)
            await self.db.commit()
            return post, False

        self.db.add(
            AddaReactionEntity(
                id=f"arxn_{uuid.uuid4().hex[:12]}",
                post_id=post_id,
                user_id=user_id,
                reaction_type=reaction_type,
                created_at=self._now_iso(),
            )
        )
        await self.db.commit()
        return post, True


async def get_adda_repository(db: AsyncSession = Depends(get_db)) -> AddaRepository:
    return AddaRepository(db)
