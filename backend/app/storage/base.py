# backend/app/storage/base.py
from abc import ABC, abstractmethod
from typing import Optional
from app.features.books.repository import BookRepository
from app.features.reading.repository import ReadingRepository
from app.features.lending.repository import LendingRepository
from app.features.wishlist.repository import WishlistRepository
from app.features.settings.repository import SettingsRepository
from app.features.auth.repository import UserRepository


class StorageFactory(ABC):
    """Abstract Factory providing domain repositories for the configured persistence engine."""

    @property
    @abstractmethod
    def users(self) -> Optional[UserRepository]:
        """Returns the User repository if supported, else None."""
        ...

    @property
    @abstractmethod
    def books(self) -> BookRepository:
        """Returns the Book repository."""
        ...

    @property
    @abstractmethod
    def reading(self) -> ReadingRepository:
        """Returns the Reading repository."""
        ...

    @property
    @abstractmethod
    def lending(self) -> LendingRepository:
        """Returns the Lending repository."""
        ...

    @property
    @abstractmethod
    def wishlist(self) -> WishlistRepository:
        """Returns the Wishlist repository."""
        ...

    @property
    @abstractmethod
    def settings(self) -> SettingsRepository:
        """Returns the Settings repository."""
        ...

    @abstractmethod
    async def close(self) -> None:
        """Closes any underlying connection pools or network sessions."""
        ...
