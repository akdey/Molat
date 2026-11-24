# backend/app/features/wishlist/repository.py
from abc import ABC, abstractmethod
from typing import List, Optional
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.features.books.models import Book


class WishlistRepository(ABC):
    """Abstract interface defining persistence operations for wishlist items."""

    @abstractmethod
    async def list(self, user_id: str = "owner", force_refresh: bool = False) -> List[WishlistItem]:
        """Lists all wishlist items for user."""
        ...

    @abstractmethod
    async def create(self, data: WishlistItemCreate, user_id: str = "owner") -> WishlistItem:
        """Adds an item to the wishlist."""
        ...

    @abstractmethod
    async def acquire(self, wishlist_id: str, acquire_data: WishlistAcquireRequest, user_id: str = "owner") -> Optional[Book]:
        """Transfers wishlist item into Books collection and deletes the wishlist item."""
        ...
