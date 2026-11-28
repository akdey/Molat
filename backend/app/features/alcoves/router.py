# backend/app/features/alcoves/router.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import require_authenticated_user
from app.features.alcoves.dependencies import get_alcove_repository
from app.features.alcoves.emails import send_alcove_invite_email
from app.features.alcoves.models import (
    AlcoveAutoShareRequest,
    AlcoveCreateRequest,
    AlcoveEmailInviteRequest,
    AlcoveJoinRequest,
    AlcoveOverviewResponse,
    BookHolderUpdate,
    BookShareToggle,
    ReaderLookupItem,
    UserBookStateUpdate,
)
from app.features.alcoves.repository import AlcoveRepository
from app.features.auth.dependencies import get_user_repository
from app.features.auth.repository import UserRepository
from app.features.notifications.repository import (
    NotificationRepository,
    get_notification_repository,
)

router = APIRouter(prefix="/alcoves", tags=["Alcoves"])


async def _require_verified_reader(user_id: str, user_repo: UserRepository):
    """Soft-gate helper: enforces verified email for Alcove creation, invites, and joining."""
    if user_id == "owner":
        return None
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before creating, joining, or inviting to an Alcove.",
        )
    return user


@router.get("/me", response_model=AlcoveOverviewResponse)
async def get_my_alcoves(
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Returns the reader's Alcoves, members, shared books, and pending invites."""
    user = None if user_id == "owner" else await user_repo.get_by_id(user_id)
    return await alcove_repo.get_overview(user_id=user_id, user_email=user.email if user else None)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_alcove(
    req: AlcoveCreateRequest,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Creates a new shared household Alcove and enrolls the creator as Curator."""
    await _require_verified_reader(user_id, user_repo)
    alcove = await alcove_repo.create_alcove(req.name, user_id)
    return {
        "id": alcove.id,
        "name": alcove.name,
        "invite_code": alcove.invite_code,
        "created_at": alcove.created_at,
    }


@router.post("/join")
async def join_alcove(
    req: AlcoveJoinRequest,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Joins an existing Alcove using its invite code."""
    user = await _require_verified_reader(user_id, user_repo)
    alcove = await alcove_repo.join_by_code(
        req.invite_code,
        user_id=user_id,
        user_email=user.email if user else None,
    )
    if not alcove:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid Alcove invite code.")
    return {"status": "joined", "alcove_id": alcove.id, "name": alcove.name}


@router.get("/lookup", response_model=List[ReaderLookupItem])
async def lookup_readers(
    q: str = Query(..., min_length=1, max_length=50),
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
):
    """Searches registered Molat readers by ex/ handle for Alcove invitations."""
    users = await alcove_repo.search_readers(q, exclude_user_id=user_id)
    return [
        ReaderLookupItem(
            user_id=u.id,
            username=u.username,
            email_verified=bool(getattr(u, "email_verified", False)),
        )
        for u in users
    ]


@router.post("/{alcove_id}/invite")
async def invite_member_by_email(
    alcove_id: str,
    req: AlcoveEmailInviteRequest,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Invites an existing ex/ handle or external email to the Alcove via Mailbrix & in-app notification."""
    user = await _require_verified_reader(user_id, user_repo)
    raw_target = (req.identifier or req.email or "").strip()
    if not raw_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an ex/ handle or email address.",
        )

    try:
        resolved_email, resolved_username, target_type = await alcove_repo.resolve_invite_target(raw_target)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    result = await alcove_repo.create_email_invite(alcove_id, user_id, resolved_email)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alcove not found or you are not a member.",
        )
    alcove, invite = result
    inviter_username = user.username if user else "owner"

    # Deliver in-app notification if target is a registered Molat reader
    target_user = await alcove_repo.find_user_by_email(invite.invitee_email)
    if target_user:
        await notif_repo.create_notification(
            user_id=target_user.id,
            notif_type="alcove_invite",
            title=f"Invited to {alcove.name}",
            body=f"ex/{inviter_username} invited you to join their Family Alcove.",
            reference_id=invite.id,
            metadata={"invite_id": invite.id, "alcove_id": alcove.id, "alcove_name": alcove.name},
        )

    email_sent = await send_alcove_invite_email(
        to_email=invite.invitee_email,
        inviter_username=inviter_username,
        alcove_name=alcove.name,
        invite_code=alcove.invite_code,
    )
    return {
        "status": "invited",
        "target_type": target_type,
        "invitee_handle": f"ex/{resolved_username}" if resolved_username else None,
        "invite_id": invite.id,
        "invitee_email": invite.invitee_email,
        "invite_code": invite.invite_code,
        "email_sent": email_sent,
    }


@router.post("/invites/{invite_id}/accept")
async def accept_alcove_invite(
    invite_id: str,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Accepts a pending Family Alcove invitation."""
    user = await _require_verified_reader(user_id, user_repo)
    res = await alcove_repo.accept_invite(
        invite_id=invite_id,
        user_id=user_id,
        user_email=user.email if user else None,
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already handled.",
        )
    alcove, invite = res
    await notif_repo.mark_read_by_reference(user_id=user_id, reference_id=invite_id)

    if invite.invited_by_user_id and invite.invited_by_user_id != user_id:
        accepter_name = user.username if user else "reader"
        await notif_repo.create_notification(
            user_id=invite.invited_by_user_id,
            notif_type="alcove_accepted",
            title=f"ex/{accepter_name} joined {alcove.name}",
            body=f"Your Family Alcove invitation to ex/{accepter_name} was accepted.",
            reference_id=alcove.id,
            metadata={"alcove_id": alcove.id},
        )
    return {"status": "accepted", "alcove_id": alcove.id, "name": alcove.name}


@router.post("/invites/{invite_id}/decline")
async def decline_alcove_invite(
    invite_id: str,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Declines a pending Family Alcove invitation."""
    user = None if user_id == "owner" else await user_repo.get_by_id(user_id)
    invite = await alcove_repo.decline_invite(
        invite_id=invite_id,
        user_email=user.email if user else None,
    )
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or already handled.",
        )
    await notif_repo.mark_read_by_reference(user_id=user_id, reference_id=invite_id)
    return {"status": "declined", "invite_id": invite_id}


@router.delete("/{alcove_id}/members/{target_user_id}")
async def remove_alcove_member(
    alcove_id: str,
    target_user_id: str,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Curator-only: removes a member from the Alcove and detaches their books."""
    ok, msg = await alcove_repo.remove_member(alcove_id, user_id, target_user_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)

    await notif_repo.create_notification(
        user_id=target_user_id,
        notif_type="alcove_removed",
        title=f"Removed from {msg}",
        body=f"You were removed from the Family Alcove \"{msg}\" by the curator.",
        reference_id=alcove_id,
        metadata={"alcove_id": alcove_id},
    )
    return {"status": "removed", "alcove_id": alcove_id, "user_id": target_user_id}


@router.delete("/{alcove_id}/invites/{invite_id}")
async def revoke_alcove_invite(
    alcove_id: str,
    invite_id: str,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
):
    """Curator-only: revokes a pending Alcove invitation."""
    ok = await alcove_repo.revoke_invite(alcove_id, user_id, invite_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending invite not found or you do not have curator permission.",
        )
    return {"status": "revoked", "invite_id": invite_id}


@router.post("/{alcove_id}/leave")
async def leave_alcove(
    alcove_id: str,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
):
    """Leaves an Alcove and detaches your books while preserving co-readers' reading logs."""
    ok = await alcove_repo.leave_alcove(alcove_id, user_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found.")
    return {"status": "left", "alcove_id": alcove_id}


@router.put("/{alcove_id}/auto-share")
async def update_auto_share(
    alcove_id: str,
    req: AlcoveAutoShareRequest,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
):
    """Toggles auto-sharing for the member's library in this Alcove."""
    ok = await alcove_repo.set_auto_share(
        alcove_id, user_id, req.auto_share, apply_to_existing=req.apply_to_existing
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found.")
    return {"status": "updated", "auto_share": req.auto_share}


@router.put("/books/{book_id}/share")
async def toggle_book_share(
    book_id: str,
    req: BookShareToggle,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
):
    """Shares or unshares one of your own books with your Alcove."""
    res = await alcove_repo.toggle_book_share(book_id, user_id, req.shared)
    if res is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book not found or you are not in an Alcove.",
        )
    return {"status": "updated", "book_id": book_id, "alcove_id": res or None}


@router.put("/books/{book_id}/state")
async def update_personal_book_state(
    book_id: str,
    req: UserBookStateUpdate,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
):
    """Updates your own personal reading status, page, rating, and notes on a shared Alcove book."""
    state = await alcove_repo.update_user_book_state(book_id, user_id, req)
    if not state:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared book not found.")
    return {
        "book_id": state.book_id,
        "reading_status": state.reading_status,
        "current_page": state.current_page,
        "rating": state.rating,
        "notes": state.notes,
        "updated_at": state.updated_at,
    }


@router.put("/books/{book_id}/holder")
async def update_book_holder(
    book_id: str,
    req: BookHolderUpdate,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
):
    """Updates who currently holds the physical copy in the house."""
    book = await alcove_repo.update_book_holder(book_id, user_id, req.held_by_label)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared book not found.")
    return {"book_id": book.book_id, "held_by_label": book.held_by_label}
