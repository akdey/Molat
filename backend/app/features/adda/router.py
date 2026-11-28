# backend/app/features/adda/router.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_authenticated_user
from app.features.adda.models import (
    AddaCommentCreate,
    AddaCommentResponse,
    AddaFeedResponse,
    AddaPostCreate,
    AddaPostResponse,
    AddaReactionToggle,
)
from app.features.adda.repository import AddaRepository, get_adda_repository
from app.features.auth.dependencies import get_user_repository
from app.features.auth.repository import UserRepository
from app.features.notifications.repository import (
    NotificationRepository,
    get_notification_repository,
)

router = APIRouter(prefix="/adda", tags=["Adda"])


@router.get("/posts", response_model=AddaFeedResponse)
async def list_adda_posts(
    scope: str = Query(default="all", pattern="^(all|alcove|mine)$"),
    post_type: Optional[str] = Query(default="all"),
    limit: int = Query(default=40, ge=1, le=100),
    user_id: str = Depends(require_authenticated_user),
    repo: AddaRepository = Depends(get_adda_repository),
):
    """Lists Adda posts visible to the authenticated reader."""
    return await repo.list_posts(user_id=user_id, scope=scope, post_type=post_type, limit=limit)


@router.post("/posts", response_model=AddaPostResponse, status_code=status.HTTP_201_CREATED)
async def create_adda_post(
    req: AddaPostCreate,
    user_id: str = Depends(require_authenticated_user),
    repo: AddaRepository = Depends(get_adda_repository),
    user_repo: UserRepository = Depends(get_user_repository),
):
    """Publishes a new note, quote, review, or discussion to Adda."""
    user = None if user_id == "owner" else await user_repo.get_by_id(user_id)
    username = user.username if user else "owner"
    try:
        return await repo.create_post(user_id=user_id, username=username, payload=req)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/posts/{post_id}")
async def delete_adda_post(
    post_id: str,
    user_id: str = Depends(require_authenticated_user),
    repo: AddaRepository = Depends(get_adda_repository),
):
    """Deletes an Adda post authored by the current reader."""
    ok = await repo.delete_post(user_id=user_id, post_id=post_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")
    return {"status": "deleted", "id": post_id}


@router.post(
    "/posts/{post_id}/comments",
    response_model=AddaCommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_adda_comment(
    post_id: str,
    req: AddaCommentCreate,
    user_id: str = Depends(require_authenticated_user),
    repo: AddaRepository = Depends(get_adda_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Adds a reply to an Adda post and notifies the post author."""
    user = None if user_id == "owner" else await user_repo.get_by_id(user_id)
    username = user.username if user else "owner"
    result = await repo.add_comment(
        user_id=user_id,
        username=username,
        post_id=post_id,
        content=req.content,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    post, comment = result
    if post.user_id != user_id:
        await notif_repo.create_notification(
            user_id=post.user_id,
            notif_type="adda_reply",
            title=f"ex/{username} replied in Adda",
            body=req.content.strip()[:140],
            reference_id=post.id,
            metadata={"post_id": post.id, "comment_id": comment.id},
        )
    return comment


@router.delete("/comments/{comment_id}")
async def delete_adda_comment(
    comment_id: str,
    user_id: str = Depends(require_authenticated_user),
    repo: AddaRepository = Depends(get_adda_repository),
):
    """Deletes an Adda reply authored by the current reader."""
    ok = await repo.delete_comment(user_id=user_id, comment_id=comment_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found.")
    return {"status": "deleted", "id": comment_id}


@router.post("/posts/{post_id}/react")
async def toggle_adda_reaction(
    post_id: str,
    req: AddaReactionToggle,
    user_id: str = Depends(require_authenticated_user),
    repo: AddaRepository = Depends(get_adda_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    notif_repo: NotificationRepository = Depends(get_notification_repository),
):
    """Toggles a literary reaction on an Adda post."""
    result = await repo.toggle_reaction(
        user_id=user_id,
        post_id=post_id,
        reaction_type=req.reaction_type,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found.")

    post, added = result
    if added and post.user_id != user_id:
        user = None if user_id == "owner" else await user_repo.get_by_id(user_id)
        username = user.username if user else "owner"
        label = req.reaction_type.replace("_", " ")
        await notif_repo.create_notification(
            user_id=post.user_id,
            notif_type="adda_reaction",
            title=f"ex/{username} reacted ({label})",
            body=post.book_title or post.content[:100],
            reference_id=post.id,
            metadata={"post_id": post.id, "reaction_type": req.reaction_type},
        )
    return {"status": "added" if added else "removed", "reaction_type": req.reaction_type}
