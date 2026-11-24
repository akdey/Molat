# backend/app/features/settings/router.py
from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id, require_authenticated_user
from app.storage.provider import get_storage
from app.storage.base import StorageFactory
from app.features.settings.models import UserSettings, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["User & Library Settings"])


@router.get("", response_model=UserSettings)
async def get_user_settings(
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Returns user settings and reading profile."""
    return await storage.settings.get(user_id=user_id)


@router.patch("", response_model=UserSettings)
async def update_user_settings(
    updates: UserSettingsUpdate,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Updates user settings in the configured storage engine."""
    return await storage.settings.update(updates, user_id=user_id)
