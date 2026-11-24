# backend/app/features/wishlist/router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user_id, require_authenticated_user
from app.storage.provider import get_storage
from app.storage.base import StorageFactory
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.features.books.models import Book

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItem])
async def list_wishlist(
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Returns all wishlist items for the current user."""
    return await storage.wishlist.list(user_id=user_id)


@router.post("", response_model=WishlistItem, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    item_in: WishlistItemCreate,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Adds a new book to the wishlist."""
    return await storage.wishlist.create(item_in, user_id=user_id)


@router.post("/{wishlist_id}/acquire", response_model=Book)
async def acquire_wishlist_item(
    wishlist_id: str,
    acquire_data: Optional[WishlistAcquireRequest] = None,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Transfers wishlist item into Books collection and deletes the wishlist item."""
    data = acquire_data or WishlistAcquireRequest()
    new_book = await storage.wishlist.acquire(wishlist_id, data, user_id=user_id)
    if not new_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wishlist item '{wishlist_id}' not found",
        )
    return new_book
