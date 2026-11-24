# backend/app/features/books/repository.py
from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from app.features.books.models import Book, BookCreate, BookUpdate


class BookRepository(ABC):
    """Abstract interface defining all persistence operations for Books."""

    @abstractmethod
    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[Book]:
        """Lists all books belonging to the given user_id."""
        ...

    @abstractmethod
    async def get(self, book_id: str, user_id: str = "owner") -> Optional[Book]:
        """Gets a single book by ID and user_id."""
        ...

    @abstractmethod
    async def create(self, data: BookCreate, user_id: str = "owner") -> Book:
        """Creates a new book."""
        ...

    @abstractmethod
    async def update(self, book_id: str, updates: BookUpdate, user_id: str = "owner") -> Optional[Book]:
        """Updates an existing book."""
        ...

    @abstractmethod
    async def delete(self, book_id: str, user_id: str = "owner") -> bool:
        """Deletes a book."""
        ...

    @abstractmethod
    async def batch_update_covers(self, items: List[Dict[str, str]], user_id: str = "owner") -> int:
        """Batch updates cover_url for books."""
        ...
