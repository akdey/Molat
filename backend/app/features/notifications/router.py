# backend/app/features/notifications/router.py
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_authenticated_user
from app.features.notifications.models import NotificationListResponse
from app.features.notifications.repository import (
    NotificationRepository,
    get_notification_repository,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(default=30, ge=1, le=100),
    user_id: str = Depends(require_authenticated_user),
    repo: NotificationRepository = Depends(get_notification_repository),
):
    """Returns the authenticated reader's notifications and unread count."""
    return await repo.list_for_user(user_id=user_id, limit=limit)


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(require_authenticated_user),
    repo: NotificationRepository = Depends(get_notification_repository),
):
    """Marks a single notification as read."""
    ok = await repo.mark_read(user_id=user_id, notification_id=notification_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    return {"status": "read", "id": notification_id}


@router.post("/read-all")
async def mark_all_notifications_read(
    user_id: str = Depends(require_authenticated_user),
    repo: NotificationRepository = Depends(get_notification_repository),
):
    """Marks all unread notifications as read for the authenticated reader."""
    updated = await repo.mark_all_read(user_id=user_id)
    return {"status": "ok", "marked_count": updated}
