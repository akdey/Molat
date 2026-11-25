# backend/app/features/settings/router.py
from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id, require_authenticated_user
from app.features.settings.models import UserSettings, UserSettingsUpdate
from app.features.settings.repository import SettingsRepository
from app.features.settings.dependencies import get_settings_repository

router = APIRouter(prefix="/settings", tags=["User & Library Settings"])


@router.get("", response_model=UserSettings)
async def get_user_settings(
    settings_repo: SettingsRepository = Depends(get_settings_repository),
    user_id: str = Depends(get_current_user_id),
):
    """Returns user settings and reading profile."""
    return await settings_repo.get(user_id=user_id)


@router.patch("", response_model=UserSettings)
async def update_user_settings(
    updates: UserSettingsUpdate,
    settings_repo: SettingsRepository = Depends(get_settings_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Updates user settings."""
    return await settings_repo.update(updates, user_id=user_id)
