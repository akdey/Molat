# backend/app/features/reading/repository.py
from abc import ABC, abstractmethod
from typing import List, Optional
from app.features.reading.models import ReadingLog, ReadingLogCreate


class ReadingRepository(ABC):
    """Abstract interface defining persistence operations for reading logs."""

    @abstractmethod
    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[ReadingLog]:
        """Lists reading logs ordered chronologically descending."""
        ...

    @abstractmethod
    async def create(self, data: ReadingLogCreate, user_id: str = "owner") -> ReadingLog:
        """Appends a reading session log."""
        ...
