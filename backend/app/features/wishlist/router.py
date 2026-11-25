# backend/app/features/wishlist/router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user_id, require_authenticated_user
from app.features.wishlist.models import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.features.wishlist.repository import WishlistRepository
from app.features.wishlist.dependencies import get_wishlist_repository
from app.features.books.models import Book

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItem])
async def list_wishlist(
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    user_id: str = Depends(get_current_user_id),
):
    """Returns all wishlist items for the current user."""
    return await wishlist_repo.list(user_id=user_id)


@router.post("", response_model=WishlistItem, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    item_in: WishlistItemCreate,
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Adds a new book to the wishlist."""
    return await wishlist_repo.create(item_in, user_id=user_id)


@router.post("/{wishlist_id}/acquire", response_model=Book)
async def acquire_wishlist_item(
    wishlist_id: str,
    acquire_data: Optional[WishlistAcquireRequest] = None,
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Transfers wishlist item into Books collection and deletes the wishlist item."""
    data = acquire_data or WishlistAcquireRequest()
    new_book = await wishlist_repo.acquire(wishlist_id, data, user_id=user_id)
    if not new_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wishlist item '{wishlist_id}' not found",
        )
    return new_book


@router.delete("/{wishlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist_item(
    wishlist_id: str,
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Deletes an item from the wishlist."""
    await wishlist_repo.delete(wishlist_id, user_id=user_id)
    return None
