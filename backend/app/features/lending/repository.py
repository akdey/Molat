# backend/app/features/lending/repository.py
from abc import ABC, abstractmethod
from typing import List, Optional
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn


class LendingRepository(ABC):
    """Abstract interface defining persistence operations for book loans."""

    @abstractmethod
    async def list(self, status: Optional[str] = None, user_id: str = "owner", force_refresh: bool = False) -> List[LendingRecord]:
        """Lists lending records."""
        ...

    @abstractmethod
    async def get_active_for_book(self, book_id: str, user_id: str = "owner") -> Optional[LendingRecord]:
        """Returns the active loan record for a book if currently lent out."""
        ...

    @abstractmethod
    async def create(self, payload: LendingRecordCreate, user_id: str = "owner") -> LendingRecord:
        """Records a new lending transaction and marks the book location as lent."""
        ...

    @abstractmethod
    async def return_book(self, lending_id: str, return_data: LendingRecordReturn, user_id: str = "owner") -> Optional[LendingRecord]:
        """Marks a loan as returned and restores book location."""
        ...
