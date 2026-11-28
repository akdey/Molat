# backend/app/features/notifications/repository.py
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.notifications.entity import NotificationEntity
from app.features.notifications.models import NotificationItem, NotificationListResponse


class NotificationRepository:
    """Async SQLAlchemy 2.0 repository for in-app reader notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _to_model(entity: NotificationEntity) -> NotificationItem:
        metadata: Dict[str, Any] = {}
        if entity.metadata_json:
            try:
                parsed = json.loads(entity.metadata_json)
                if isinstance(parsed, dict):
                    metadata = parsed
            except json.JSONDecodeError:
                metadata = {}

        return NotificationItem(
            id=entity.id,
            type=entity.type,
            title=entity.title,
            body=entity.body,
            reference_id=entity.reference_id,
            metadata=metadata,
            is_read=bool(entity.is_read),
            created_at=entity.created_at,
        )

    async def create_notification(
        self,
        user_id: str,
        notif_type: str,
        title: str,
        body: str,
        reference_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> NotificationItem:
        entity = NotificationEntity(
            id=f"notif_{uuid.uuid4().hex[:14]}",
            user_id=user_id,
            type=notif_type,
            title=title[:200],
            body=body,
            reference_id=reference_id,
            metadata_json=json.dumps(metadata or {}),
            is_read=False,
            created_at=self._now_iso(),
        )
        self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        return self._to_model(entity)

    async def list_for_user(self, user_id: str, limit: int = 30) -> NotificationListResponse:
        rows = (
            await self.db.execute(
                select(NotificationEntity)
                .where(NotificationEntity.user_id == user_id)
                .order_by(desc(NotificationEntity.created_at))
                .limit(limit)
            )
        ).scalars().all()

        unread_count = (
            await self.db.execute(
                select(func.count())
                .select_from(NotificationEntity)
                .where(
                    NotificationEntity.user_id == user_id,
                    NotificationEntity.is_read.is_(False),
                )
            )
        ).scalar_one()

        return NotificationListResponse(
            notifications=[self._to_model(r) for r in rows],
            unread_count=int(unread_count or 0),
        )

    async def mark_read(self, user_id: str, notification_id: str) -> bool:
        res = await self.db.execute(
            update(NotificationEntity)
            .where(
                NotificationEntity.id == notification_id,
                NotificationEntity.user_id == user_id,
            )
            .values(is_read=True)
        )
        await self.db.commit()
        return (res.rowcount or 0) > 0

    async def mark_read_by_reference(self, user_id: str, reference_id: str) -> None:
        await self.db.execute(
            update(NotificationEntity)
            .where(
                NotificationEntity.user_id == user_id,
                NotificationEntity.reference_id == reference_id,
            )
            .values(is_read=True)
        )
        await self.db.commit()

    async def mark_all_read(self, user_id: str) -> int:
        res = await self.db.execute(
            update(NotificationEntity)
            .where(
                NotificationEntity.user_id == user_id,
                NotificationEntity.is_read.is_(False),
            )
            .values(is_read=True)
        )
        await self.db.commit()
        return int(res.rowcount or 0)


async def get_notification_repository(
    db: AsyncSession = Depends(get_db),
) -> NotificationRepository:
    return NotificationRepository(db)
