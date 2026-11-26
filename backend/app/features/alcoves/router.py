# backend/app/features/alcoves/router.py
from fastapi import APIRouter, Depends, HTTPException, status
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
    UserBookStateUpdate,
)
from app.features.alcoves.repository import AlcoveRepository
from app.features.auth.dependencies import get_user_repository
from app.features.auth.repository import UserRepository

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


@router.post("/{alcove_id}/invite")
async def invite_member_by_email(
    alcove_id: str,
    req: AlcoveEmailInviteRequest,
    user_id: str = Depends(require_authenticated_user),
    alcove_repo: AlcoveRepository = Depends(get_alcove_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Creates an Alcove invite record and sends an invitation email via Mailbridge."""
    user = await _require_verified_reader(user_id, user_repo)
    result = await alcove_repo.create_email_invite(alcove_id, user_id, req.email)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alcove not found or you are not a member.",
        )
    alcove, invite = result
    inviter_username = user.username if user else "owner"
    email_sent = await send_alcove_invite_email(
        to_email=invite.invitee_email,
        inviter_username=inviter_username,
        alcove_name=alcove.name,
        invite_code=alcove.invite_code,
    )
    return {
        "status": "invited",
        "invite_id": invite.id,
        "invitee_email": invite.invitee_email,
        "invite_code": invite.invite_code,
        "email_sent": email_sent,
    }


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
