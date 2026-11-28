# backend/app/features/notifications/models.py
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    body: str
    reference_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_read: bool = False
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: List[NotificationItem]
    unread_count: int
