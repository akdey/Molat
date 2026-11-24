# backend/app/features/settings/repository.py
from abc import ABC, abstractmethod
from app.features.settings.models import UserSettings, UserSettingsUpdate


class SettingsRepository(ABC):
    """Abstract interface defining persistence operations for user settings."""

    @abstractmethod
    async def get(self, user_id: str = "owner", force_refresh: bool = False) -> UserSettings:
        """Retrieves settings profile for user."""
        ...

    @abstractmethod
    async def update(self, updates: UserSettingsUpdate, user_id: str = "owner") -> UserSettings:
        """Updates settings profile for user."""
        ...
