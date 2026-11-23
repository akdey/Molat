from fastapi import APIRouter, Depends
from app.middleware import verify_library_key
from app.models.settings import UserSettings, UserSettingsUpdate
from app.repositories.sheets_repository import sheets_repo

router = APIRouter(prefix="/settings", tags=["User & Library Settings"])


@router.get("", response_model=UserSettings)
async def get_user_settings():
    """
    Returns user settings and reading profile stored in Google Sheets:
    - daily_goal_pages: Target reading velocity (defaults to 15)
    - active_book_id: Currently active/last read volume
    - theme: Visual theme ('light' | 'dark')
    """
    return await sheets_repo.get_settings()


@router.patch("", response_model=UserSettings)
async def update_user_settings(
    updates: UserSettingsUpdate,
    _: bool = Depends(verify_library_key),
):
    """
    Updates user settings in Google Sheets database (Settings tab).
    Persists changes across all devices. Requires Owner authentication.
    """
    return await sheets_repo.update_settings(updates)
