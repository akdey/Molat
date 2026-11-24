# backend/app/storage/postgres.py
from typing import Optional
import asyncpg
from app.storage.base import StorageFactory
from app.features.books.postgres_repo import PostgresBookRepository
from app.features.reading.postgres_repo import PostgresReadingRepository
from app.features.lending.postgres_repo import PostgresLendingRepository
from app.features.wishlist.postgres_repo import PostgresWishlistRepository
from app.features.settings.postgres_repo import PostgresSettingsRepository
from app.features.auth.postgres_repo import PostgresUserRepository


class PostgresStorageFactory(StorageFactory):
    """Concrete Storage Factory creating asyncpg-backed PostgreSQL repositories."""

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool
        self._users = PostgresUserRepository(pool)
        self._books = PostgresBookRepository(pool)
        self._reading = PostgresReadingRepository(pool)
        self._lending = PostgresLendingRepository(pool)
        self._wishlist = PostgresWishlistRepository(pool, book_repo=self._books)
        self._settings = PostgresSettingsRepository(pool, reading_repo=self._reading, book_repo=self._books)

    @property
    def users(self) -> Optional[PostgresUserRepository]:
        return self._users

    @property
    def books(self) -> PostgresBookRepository:
        return self._books

    @property
    def reading(self) -> PostgresReadingRepository:
        return self._reading

    @property
    def lending(self) -> PostgresLendingRepository:
        return self._lending

    @property
    def wishlist(self) -> PostgresWishlistRepository:
        return self._wishlist

    @property
    def settings(self) -> PostgresSettingsRepository:
        return self._settings

    async def close(self) -> None:
        await self._pool.close()
