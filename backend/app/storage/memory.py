# backend/app/storage/memory.py
from typing import Optional
from app.storage.base import StorageFactory
from app.features.books.memory_repo import MemoryBookRepository
from app.features.reading.memory_repo import MemoryReadingRepository
from app.features.lending.memory_repo import MemoryLendingRepository
from app.features.wishlist.memory_repo import MemoryWishlistRepository
from app.features.settings.memory_repo import MemorySettingsRepository
from app.features.auth.memory_repo import MemoryUserRepository


class MemoryStorageFactory(StorageFactory):
    """Concrete Storage Factory creating in-memory repositories for testing and offline dev."""

    def __init__(self):
        self._users = MemoryUserRepository()
        self._books = MemoryBookRepository()
        self._reading = MemoryReadingRepository(book_repo=self._books)
        self._lending = MemoryLendingRepository(book_repo=self._books)
        self._wishlist = MemoryWishlistRepository(book_repo=self._books)
        self._settings = MemorySettingsRepository(reading_repo=self._reading, book_repo=self._books)

    @property
    def users(self) -> Optional[MemoryUserRepository]:
        return self._users

    @property
    def books(self) -> MemoryBookRepository:
        return self._books

    @property
    def reading(self) -> MemoryReadingRepository:
        return self._reading

    @property
    def lending(self) -> MemoryLendingRepository:
        return self._lending

    @property
    def wishlist(self) -> MemoryWishlistRepository:
        return self._wishlist

    @property
    def settings(self) -> MemorySettingsRepository:
        return self._settings

    async def close(self) -> None:
        pass
