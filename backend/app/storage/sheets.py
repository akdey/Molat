# backend/app/storage/sheets.py
from typing import Optional
from app.storage.base import StorageFactory
from app.features.books.sheets_repo import SheetsBookRepository
from app.features.reading.sheets_repo import SheetsReadingRepository
from app.features.lending.sheets_repo import SheetsLendingRepository
from app.features.wishlist.sheets_repo import SheetsWishlistRepository
from app.features.settings.sheets_repo import SheetsSettingsRepository


class SheetsStorageFactory(StorageFactory):
    """Concrete Storage Factory creating Google Sheets Apps Script bridge repositories."""

    def __init__(self, bridge_url: str, bridge_token: Optional[str] = None):
        self.bridge_url = bridge_url
        self.bridge_token = bridge_token
        self._books = SheetsBookRepository(bridge_url, bridge_token)
        self._reading = SheetsReadingRepository(bridge_url, bridge_token, book_repo=self._books)
        self._lending = SheetsLendingRepository(bridge_url, bridge_token, book_repo=self._books)
        self._wishlist = SheetsWishlistRepository(bridge_url, bridge_token, book_repo=self._books)
        self._settings = SheetsSettingsRepository(bridge_url, bridge_token, reading_repo=self._reading, book_repo=self._books)

    @property
    def books(self) -> SheetsBookRepository:
        return self._books

    @property
    def reading(self) -> SheetsReadingRepository:
        return self._reading

    @property
    def lending(self) -> SheetsLendingRepository:
        return self._lending

    @property
    def wishlist(self) -> SheetsWishlistRepository:
        return self._wishlist

    @property
    def settings(self) -> SheetsSettingsRepository:
        return self._settings

    async def close(self) -> None:
        pass
