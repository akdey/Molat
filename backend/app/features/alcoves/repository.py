# backend/app/features/alcoves/repository.py
import secrets
import string
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.alcoves.entity import (
    AlcoveEntity,
    AlcoveInviteEntity,
    AlcoveMemberEntity,
    UserBookStateEntity,
)
from app.features.alcoves.models import (
    AlcoveBookItem,
    AlcoveInviteResponse,
    AlcoveMemberResponse,
    AlcoveOverviewResponse,
    AlcoveSummary,
    UserBookStateUpdate,
)
from app.features.auth.entity import UserEntity
from app.features.books.entity import BookEntity
from app.features.books.models import BookCondition, ReadingStatus

IST = ZoneInfo("Asia/Kolkata")


def _generate_invite_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    code = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"ALC-{code}"


class AlcoveRepository:
    """SQLAlchemy 2.0 async repository for Alcoves (Shared Household Libraries)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_overview(self, user_id: str, user_email: Optional[str] = None) -> AlcoveOverviewResponse:
        # 1. Find all Alcove memberships for user_id
        my_memberships = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(AlcoveMemberEntity.user_id == user_id)
            )
        ).scalars().all()

        alcove_ids = [m.alcove_id for m in my_memberships]
        membership_by_alcove = {m.alcove_id: m for m in my_memberships}

        alcove_summaries: List[AlcoveSummary] = []
        shared_books: List[AlcoveBookItem] = []

        if alcove_ids:
            alcoves = (
                await self.session.execute(select(AlcoveEntity).where(AlcoveEntity.id.in_(alcove_ids)))
            ).scalars().all()

            all_members = (
                await self.session.execute(
                    select(AlcoveMemberEntity, UserEntity.username)
                    .join(UserEntity, AlcoveMemberEntity.user_id == UserEntity.id)
                    .where(AlcoveMemberEntity.alcove_id.in_(alcove_ids))
                )
            ).all()

            members_by_alcove: Dict[str, List[AlcoveMemberResponse]] = {}
            for mem, uname in all_members:
                members_by_alcove.setdefault(mem.alcove_id, []).append(
                    AlcoveMemberResponse(
                        user_id=mem.user_id,
                        username=uname,
                        role=mem.role,
                        auto_share=bool(mem.auto_share),
                        joined_at=mem.joined_at,
                    )
                )

            sent_invites_rows = (
                await self.session.execute(
                    select(AlcoveInviteEntity)
                    .where(
                        AlcoveInviteEntity.alcove_id.in_(alcove_ids),
                        AlcoveInviteEntity.status == "PENDING",
                    )
                    .order_by(AlcoveInviteEntity.created_at.desc())
                )
            ).scalars().all()

            invites_by_alcove: Dict[str, List[AlcoveInviteResponse]] = {}
            for inv in sent_invites_rows:
                invites_by_alcove.setdefault(inv.alcove_id, []).append(
                    AlcoveInviteResponse(
                        id=inv.id,
                        alcove_id=inv.alcove_id,
                        invitee_email=inv.invitee_email,
                        invite_code=inv.invite_code,
                        status=inv.status,
                        created_at=inv.created_at,
                    )
                )

            for alc in alcoves:
                my_mem = membership_by_alcove[alc.id]
                alcove_summaries.append(
                    AlcoveSummary(
                        id=alc.id,
                        name=alc.name,
                        invite_code=alc.invite_code,
                        created_by=alc.created_by,
                        my_role=my_mem.role,
                        my_auto_share=bool(my_mem.auto_share),
                        created_at=alc.created_at,
                        members=members_by_alcove.get(alc.id, []),
                        sent_invites=invites_by_alcove.get(alc.id, []),
                    )
                )

            # Fetch all books shared into user's Alcove(s), hydrated with owner username & current user's personal state
            book_rows = (
                await self.session.execute(
                    select(BookEntity, UserEntity.username)
                    .join(UserEntity, BookEntity.user_id == UserEntity.id)
                    .where(BookEntity.alcove_id.in_(alcove_ids))
                    .order_by(BookEntity.title.asc())
                )
            ).all()

            book_ids = [b.book_id for b, _ in book_rows]
            states_by_book: Dict[str, UserBookStateEntity] = {}
            if book_ids:
                state_rows = (
                    await self.session.execute(
                        select(UserBookStateEntity).where(
                            UserBookStateEntity.user_id == user_id,
                            UserBookStateEntity.book_id.in_(book_ids),
                        )
                    )
                ).scalars().all()
                states_by_book = {s.book_id: s for s in state_rows}

            for b, owner_username in book_rows:
                genre_names = [g.name for g in b.genres] if getattr(b, "genres", None) else []
                personal = states_by_book.get(b.book_id)
                is_owner = b.user_id == user_id

                # Owners fall back to their BookEntity reading_status/rating/notes if no separate state row exists
                if personal:
                    my_status = ReadingStatus(personal.reading_status)
                    my_page = personal.current_page or 0
                    my_rating = personal.rating
                    my_notes = personal.notes
                elif is_owner:
                    my_status = ReadingStatus(b.reading_status) if b.reading_status else ReadingStatus.UNREAD
                    my_page = 0
                    my_rating = b.rating
                    my_notes = b.notes
                else:
                    my_status = ReadingStatus.UNREAD
                    my_page = 0
                    my_rating = None
                    my_notes = None

                shared_books.append(
                    AlcoveBookItem(
                        book_id=b.book_id,
                        owner_user_id=b.user_id,
                        owner_username=owner_username,
                        alcove_id=b.alcove_id or "",
                        title=b.title,
                        subtitle=b.subtitle,
                        authors=b.authors,
                        isbn_10=b.isbn_10,
                        isbn_13=b.isbn_13,
                        publisher=b.publisher,
                        publication_year=b.publication_year,
                        language=b.language or "English",
                        genres=genre_names,
                        cover_url=b.cover_url,
                        condition=BookCondition(b.condition) if b.condition else BookCondition.GOOD,
                        location=b.location or "Home Shelf",
                        held_by_label=b.held_by_label,
                        my_reading_status=my_status,
                        my_current_page=my_page,
                        my_rating=my_rating,
                        my_notes=my_notes,
                    )
                )

        # Pending email invites addressed to the current user
        pending_for_me: List[AlcoveInviteResponse] = []
        if user_email:
            clean_email = user_email.strip().lower()
            inv_rows = (
                await self.session.execute(
                    select(AlcoveInviteEntity, AlcoveEntity.name, UserEntity.username)
                    .join(AlcoveEntity, AlcoveInviteEntity.alcove_id == AlcoveEntity.id)
                    .join(UserEntity, AlcoveInviteEntity.invited_by_user_id == UserEntity.id)
                    .where(
                        func.lower(AlcoveInviteEntity.invitee_email) == clean_email,
                        AlcoveInviteEntity.status == "PENDING",
                    )
                    .order_by(AlcoveInviteEntity.created_at.desc())
                )
            ).all()
            for inv, alc_name, inviter_uname in inv_rows:
                if inv.alcove_id not in membership_by_alcove:
                    pending_for_me.append(
                        AlcoveInviteResponse(
                            id=inv.id,
                            alcove_id=inv.alcove_id,
                            alcove_name=alc_name,
                            invited_by_username=inviter_uname,
                            invitee_email=inv.invitee_email,
                            invite_code=inv.invite_code,
                            status=inv.status,
                            created_at=inv.created_at,
                        )
                    )

        return AlcoveOverviewResponse(
            alcoves=alcove_summaries,
            shared_books=shared_books,
            pending_invites_for_me=pending_for_me,
        )

    async def create_alcove(self, name: str, user_id: str) -> AlcoveEntity:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        alcove = AlcoveEntity(
            id=f"alc_{uuid.uuid4().hex[:12]}",
            name=name.strip(),
            invite_code=_generate_invite_code(),
            created_by=user_id,
            created_at=now_str,
        )
        self.session.add(alcove)
        member = AlcoveMemberEntity(
            id=f"mem_{uuid.uuid4().hex[:12]}",
            alcove_id=alcove.id,
            user_id=user_id,
            role="curator",
            auto_share=False,
            joined_at=now_str,
        )
        self.session.add(member)
        await self.session.commit()
        await self.session.refresh(alcove)
        return alcove

    async def join_by_code(
        self, invite_code: str, user_id: str, user_email: Optional[str] = None
    ) -> Optional[AlcoveEntity]:
        clean_code = invite_code.strip().upper()
        alcove = (
            await self.session.execute(select(AlcoveEntity).where(AlcoveEntity.invite_code == clean_code))
        ).scalar_one_or_none()
        if not alcove:
            return None

        existing = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove.id,
                    AlcoveMemberEntity.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        if not existing:
            self.session.add(
                AlcoveMemberEntity(
                    id=f"mem_{uuid.uuid4().hex[:12]}",
                    alcove_id=alcove.id,
                    user_id=user_id,
                    role="member",
                    auto_share=False,
                    joined_at=now_str,
                )
            )

        if user_email:
            await self.session.execute(
                update(AlcoveInviteEntity)
                .where(
                    AlcoveInviteEntity.alcove_id == alcove.id,
                    func.lower(AlcoveInviteEntity.invitee_email) == user_email.strip().lower(),
                    AlcoveInviteEntity.status == "PENDING",
                )
                .values(status="ACCEPTED")
            )

        await self.session.commit()
        return alcove

    async def search_readers(self, query: str, exclude_user_id: str, limit: int = 6) -> List[UserEntity]:
        clean = query.strip().lower()
        if clean.startswith("ex/"):
            clean = clean[3:]
        elif clean.startswith("@"):
            clean = clean[1:]
        if not clean:
            return []
        stmt = (
            select(UserEntity)
            .where(
                UserEntity.id != exclude_user_id,
                func.lower(UserEntity.username).like(f"%{clean}%"),
            )
            .order_by(UserEntity.username.asc())
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def resolve_invite_target(self, raw_identifier: str) -> tuple[str, Optional[str], str]:
        """
        Resolves an invite target from either 'ex/username', 'username', or 'email'.
        Returns (resolved_email, resolved_username_or_None, target_type: 'member'|'external').
        """
        clean = raw_identifier.strip().lower()
        if "@" in clean:
            existing = (
                await self.session.execute(select(UserEntity).where(func.lower(UserEntity.email) == clean))
            ).scalar_one_or_none()
            if existing:
                return existing.email, existing.username, "member"
            return clean, None, "external"

        handle = clean[3:] if clean.startswith("ex/") else clean.lstrip("@")
        user = (
            await self.session.execute(select(UserEntity).where(func.lower(UserEntity.username) == handle))
        ).scalar_one_or_none()
        if not user:
            raise ValueError(f"No Molat reader found with handle ex/{handle}. Enter their email to invite externally.")
        return user.email, user.username, "member"

    async def create_email_invite(
        self, alcove_id: str, inviter_user_id: str, invitee_email: str
    ) -> Optional[tuple[AlcoveEntity, AlcoveInviteEntity]]:
        # Verify inviter is a member of this Alcove
        membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == inviter_user_id,
                )
            )
        ).scalar_one_or_none()
        if not membership:
            return None

        alcove = await self.session.get(AlcoveEntity, alcove_id)
        if not alcove:
            return None

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        invite = AlcoveInviteEntity(
            id=f"inv_{uuid.uuid4().hex[:12]}",
            alcove_id=alcove.id,
            invited_by_user_id=inviter_user_id,
            invitee_email=invitee_email.strip().lower(),
            invite_code=alcove.invite_code,
            status="PENDING",
            created_at=now_str,
        )
        self.session.add(invite)
        await self.session.commit()
        await self.session.refresh(invite)
        return alcove, invite

    async def accept_invite(
        self, invite_id: str, user_id: str, user_email: Optional[str] = None
    ) -> Optional[tuple[AlcoveEntity, AlcoveInviteEntity]]:
        invite = await self.session.get(AlcoveInviteEntity, invite_id)
        if not invite or invite.status != "PENDING":
            return None

        if user_email and invite.invitee_email.lower() != user_email.strip().lower():
            return None

        alcove = await self.session.get(AlcoveEntity, invite.alcove_id)
        if not alcove:
            return None

        existing = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove.id,
                    AlcoveMemberEntity.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        if not existing:
            self.session.add(
                AlcoveMemberEntity(
                    id=f"mem_{uuid.uuid4().hex[:12]}",
                    alcove_id=alcove.id,
                    user_id=user_id,
                    role="member",
                    auto_share=False,
                    joined_at=now_str,
                )
            )

        invite.status = "ACCEPTED"
        await self.session.commit()
        await self.session.refresh(invite)
        return alcove, invite

    async def decline_invite(
        self, invite_id: str, user_email: Optional[str] = None
    ) -> Optional[AlcoveInviteEntity]:
        invite = await self.session.get(AlcoveInviteEntity, invite_id)
        if not invite or invite.status != "PENDING":
            return None

        if user_email and invite.invitee_email.lower() != user_email.strip().lower():
            return None

        invite.status = "DECLINED"
        await self.session.commit()
        await self.session.refresh(invite)
        return invite

    async def remove_member(
        self, alcove_id: str, actor_user_id: str, target_user_id: str
    ) -> Optional[AlcoveEntity]:
        if actor_user_id == target_user_id:
            raise ValueError("Use Leave Alcove to remove yourself.")

        actor_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == actor_user_id,
                )
            )
        ).scalar_one_or_none()
        if not actor_membership or actor_membership.role != "curator":
            raise PermissionError("Only the Alcove curator can remove members.")

        target_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == target_user_id,
                )
            )
        ).scalar_one_or_none()
        if not target_membership:
            return None

        alcove = await self.session.get(AlcoveEntity, alcove_id)
        await self.session.execute(
            update(BookEntity)
            .where(BookEntity.user_id == target_user_id, BookEntity.alcove_id == alcove_id)
            .values(alcove_id=None)
        )
        await self.session.execute(
            delete(AlcoveMemberEntity).where(
                AlcoveMemberEntity.alcove_id == alcove_id,
                AlcoveMemberEntity.user_id == target_user_id,
            )
        )
        await self.session.commit()
        return alcove

    async def revoke_invite(
        self, alcove_id: str, actor_user_id: str, invite_id: str
    ) -> bool:
        actor_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == actor_user_id,
                )
            )
        ).scalar_one_or_none()
        if not actor_membership or actor_membership.role != "curator":
            raise PermissionError("Only the Alcove curator can revoke invitations.")

        res = await self.session.execute(
            delete(AlcoveInviteEntity).where(
                AlcoveInviteEntity.id == invite_id,
                AlcoveInviteEntity.alcove_id == alcove_id,
                AlcoveInviteEntity.status == "PENDING",
            )
        )
        await self.session.commit()
        return (res.rowcount or 0) > 0

    async def leave_alcove(self, alcove_id: str, user_id: str) -> bool:
        membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if not membership:
            return False

        # Detach this user's books from the Alcove (other readers' reading_logs keep book_title snapshots)
        await self.session.execute(
            update(BookEntity)
            .where(BookEntity.user_id == user_id, BookEntity.alcove_id == alcove_id)
            .values(alcove_id=None)
        )

        await self.session.execute(
            delete(AlcoveMemberEntity).where(
                AlcoveMemberEntity.alcove_id == alcove_id,
                AlcoveMemberEntity.user_id == user_id,
            )
        )
        await self.session.commit()
        return True

    async def find_user_by_email(self, email: str) -> Optional[UserEntity]:
        return (
            await self.session.execute(
                select(UserEntity).where(func.lower(UserEntity.email) == email.strip().lower())
            )
        ).scalar_one_or_none()

    async def accept_invite(
        self, invite_id: str, user_id: str, user_email: Optional[str]
    ) -> Optional[tuple[AlcoveEntity, AlcoveInviteEntity]]:
        invite = await self.session.get(AlcoveInviteEntity, invite_id)
        if not invite or invite.status != "PENDING":
            return None
        if not user_email or invite.invitee_email.strip().lower() != user_email.strip().lower():
            return None

        alcove = await self.session.get(AlcoveEntity, invite.alcove_id)
        if not alcove:
            return None

        existing = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove.id,
                    AlcoveMemberEntity.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        if not existing:
            self.session.add(
                AlcoveMemberEntity(
                    id=f"alcm_{uuid.uuid4().hex[:12]}",
                    alcove_id=alcove.id,
                    user_id=user_id,
                    role="member",
                    auto_share=False,
                    joined_at=now_str,
                )
            )

        invite.status = "ACCEPTED"
        await self.session.commit()
        return alcove, invite

    async def decline_invite(
        self, invite_id: str, user_email: Optional[str]
    ) -> Optional[AlcoveInviteEntity]:
        invite = await self.session.get(AlcoveInviteEntity, invite_id)
        if not invite or invite.status != "PENDING":
            return None
        if not user_email or invite.invitee_email.strip().lower() != user_email.strip().lower():
            return None
        invite.status = "DECLINED"
        await self.session.commit()
        return invite

    async def remove_member(
        self, alcove_id: str, actor_user_id: str, target_user_id: str
    ) -> Optional[AlcoveEntity]:
        actor_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == actor_user_id,
                )
            )
        ).scalar_one_or_none()
        if not actor_membership or actor_membership.role != "curator":
            raise PermissionError("Only the Alcove Curator can remove members.")
        if actor_user_id == target_user_id:
            raise ValueError("Use Leave Alcove to remove yourself.")

        target_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == target_user_id,
                )
            )
        ).scalar_one_or_none()
        if not target_membership:
            return None

        alcove = await self.session.get(AlcoveEntity, alcove_id)
        await self.session.execute(
            update(BookEntity)
            .where(BookEntity.user_id == target_user_id, BookEntity.alcove_id == alcove_id)
            .values(alcove_id=None)
        )
        await self.session.execute(
            delete(AlcoveMemberEntity).where(
                AlcoveMemberEntity.alcove_id == alcove_id,
                AlcoveMemberEntity.user_id == target_user_id,
            )
        )
        await self.session.commit()
        return alcove

    async def revoke_invite(
        self, alcove_id: str, actor_user_id: str, invite_id: str
    ) -> bool:
        actor_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == actor_user_id,
                )
            )
        ).scalar_one_or_none()
        if not actor_membership or actor_membership.role != "curator":
            raise PermissionError("Only the Alcove Curator can revoke invitations.")

        res = await self.session.execute(
            delete(AlcoveInviteEntity).where(
                AlcoveInviteEntity.id == invite_id,
                AlcoveInviteEntity.alcove_id == alcove_id,
                AlcoveInviteEntity.status == "PENDING",
            )
        )
        await self.session.commit()
        return (res.rowcount or 0) > 0

    async def get_user_by_email(self, email: str) -> Optional[UserEntity]:
        return (
            await self.session.execute(
                select(UserEntity).where(func.lower(UserEntity.email) == email.strip().lower())
            )
        ).scalar_one_or_none()

    async def accept_invite(
        self, invite_id: str, user_id: str, user_email: Optional[str] = None
    ) -> Optional[tuple[AlcoveEntity, AlcoveInviteEntity]]:
        invite = await self.session.get(AlcoveInviteEntity, invite_id)
        if not invite or invite.status != "PENDING":
            return None
        if user_email and invite.invitee_email.lower() != user_email.strip().lower():
            return None

        alcove = await self.session.get(AlcoveEntity, invite.alcove_id)
        if not alcove:
            return None

        existing = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove.id,
                    AlcoveMemberEntity.user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        if not existing:
            self.session.add(
                AlcoveMemberEntity(
                    id=f"mem_{uuid.uuid4().hex[:12]}",
                    alcove_id=alcove.id,
                    user_id=user_id,
                    role="member",
                    auto_share=False,
                    joined_at=now_str,
                )
            )

        invite.status = "ACCEPTED"
        await self.session.commit()
        return alcove, invite

    async def decline_invite(
        self, invite_id: str, user_email: Optional[str] = None
    ) -> Optional[AlcoveInviteEntity]:
        invite = await self.session.get(AlcoveInviteEntity, invite_id)
        if not invite or invite.status != "PENDING":
            return None
        if user_email and invite.invitee_email.lower() != user_email.strip().lower():
            return None

        invite.status = "DECLINED"
        await self.session.commit()
        return invite

    async def remove_member(
        self, alcove_id: str, actor_user_id: str, target_user_id: str
    ) -> tuple[bool, str]:
        if actor_user_id == target_user_id:
            return False, "Use Leave Alcove to remove yourself."

        actor_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == actor_user_id,
                )
            )
        ).scalar_one_or_none()
        if not actor_membership or actor_membership.role != "curator":
            return False, "Only the Alcove curator can remove members."

        target_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == target_user_id,
                )
            )
        ).scalar_one_or_none()
        if not target_membership:
            return False, "Member not found in this Alcove."

        alcove = await self.session.get(AlcoveEntity, alcove_id)
        alcove_name = alcove.name if alcove else "Family Alcove"

        await self.session.execute(
            update(BookEntity)
            .where(BookEntity.user_id == target_user_id, BookEntity.alcove_id == alcove_id)
            .values(alcove_id=None)
        )
        await self.session.execute(
            delete(AlcoveMemberEntity).where(
                AlcoveMemberEntity.alcove_id == alcove_id,
                AlcoveMemberEntity.user_id == target_user_id,
            )
        )
        await self.session.commit()
        return True, alcove_name

    async def revoke_invite(
        self, alcove_id: str, actor_user_id: str, invite_id: str
    ) -> bool:
        actor_membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == actor_user_id,
                )
            )
        ).scalar_one_or_none()
        if not actor_membership or actor_membership.role != "curator":
            return False

        res = await self.session.execute(
            delete(AlcoveInviteEntity).where(
                AlcoveInviteEntity.id == invite_id,
                AlcoveInviteEntity.alcove_id == alcove_id,
                AlcoveInviteEntity.status == "PENDING",
            )
        )
        await self.session.commit()
        return (res.rowcount or 0) > 0

    async def set_auto_share(
        self, alcove_id: str, user_id: str, auto_share: bool, apply_to_existing: bool = True
    ) -> bool:
        membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == alcove_id,
                    AlcoveMemberEntity.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        if not membership:
            return False

        membership.auto_share = auto_share
        if apply_to_existing:
            if auto_share:
                await self.session.execute(
                    update(BookEntity)
                    .where(BookEntity.user_id == user_id)
                    .values(alcove_id=alcove_id)
                )
            else:
                await self.session.execute(
                    update(BookEntity)
                    .where(BookEntity.user_id == user_id, BookEntity.alcove_id == alcove_id)
                    .values(alcove_id=None)
                )
        await self.session.commit()
        return True

    async def toggle_book_share(self, book_id: str, user_id: str, shared: bool) -> Optional[str]:
        book = (
            await self.session.execute(
                select(BookEntity).where(BookEntity.book_id == book_id, BookEntity.user_id == user_id)
            )
        ).scalar_one_or_none()
        if not book:
            return None

        if not shared:
            book.alcove_id = None
            await self.session.commit()
            return ""

        membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(AlcoveMemberEntity.user_id == user_id)
            )
        ).scalars().first()
        if not membership:
            return None

        book.alcove_id = membership.alcove_id
        await self.session.commit()
        return membership.alcove_id

    async def _verify_book_alcove_access(self, book_id: str, user_id: str) -> Optional[BookEntity]:
        book = (
            await self.session.execute(select(BookEntity).where(BookEntity.book_id == book_id))
        ).scalar_one_or_none()
        if not book:
            return None
        if book.user_id == user_id:
            return book
        if not book.alcove_id:
            return None
        membership = (
            await self.session.execute(
                select(AlcoveMemberEntity).where(
                    AlcoveMemberEntity.alcove_id == book.alcove_id,
                    AlcoveMemberEntity.user_id == user_id,
                )
            )
        ).scalar_one_or_none()
        return book if membership else None

    async def update_user_book_state(
        self, book_id: str, user_id: str, payload: UserBookStateUpdate
    ) -> Optional[UserBookStateEntity]:
        book = await self._verify_book_alcove_access(book_id, user_id)
        if not book:
            return None

        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        state = (
            await self.session.execute(
                select(UserBookStateEntity).where(
                    UserBookStateEntity.user_id == user_id,
                    UserBookStateEntity.book_id == book_id,
                )
            )
        ).scalar_one_or_none()

        if not state:
            state = UserBookStateEntity(
                id=f"ubs_{uuid.uuid4().hex[:12]}",
                user_id=user_id,
                book_id=book_id,
                reading_status="UNREAD",
                current_page=0,
            )
            self.session.add(state)

        data = payload.model_dump(exclude_unset=True)
        if "reading_status" in data and data["reading_status"] is not None:
            val = data["reading_status"]
            state.reading_status = val.value if hasattr(val, "value") else str(val)
        if "current_page" in data and data["current_page"] is not None:
            state.current_page = data["current_page"]
        if "rating" in data:
            state.rating = data["rating"]
        if "notes" in data:
            state.notes = data["notes"]
        state.updated_at = now_str

        # Keep owner's primary BookEntity in sync when owner updates their own state
        if book.user_id == user_id:
            if "reading_status" in data and data["reading_status"] is not None:
                book.reading_status = state.reading_status
            if "rating" in data:
                book.rating = state.rating
            if "notes" in data:
                book.notes = state.notes
            book.updated_at = now_str

        await self.session.commit()
        await self.session.refresh(state)
        return state

    async def update_book_holder(
        self, book_id: str, user_id: str, held_by_label: Optional[str]
    ) -> Optional[BookEntity]:
        book = await self._verify_book_alcove_access(book_id, user_id)
        if not book:
            return None
        book.held_by_label = held_by_label.strip() if held_by_label and held_by_label.strip() else None
        book.updated_at = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        await self.session.commit()
        await self.session.refresh(book)
        return book
