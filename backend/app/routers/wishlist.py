from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware import verify_library_key
from app.models.book import Book
from app.models.wishlist import WishlistItem, WishlistItemCreate, WishlistAcquireRequest
from app.repositories.sheets_repository import sheets_repo

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItem])
async def list_wishlist():
    """Returns all wishlist items."""
    return await sheets_repo.list_wishlist()


@router.post("", response_model=WishlistItem, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    item_in: WishlistItemCreate,
    _: bool = Depends(verify_library_key),
):
    """Adds a new book to the wishlist."""
    return await sheets_repo.create_wishlist_item(item_in)


@router.post("/{wishlist_id}/acquire", response_model=Book)
async def acquire_wishlist_item(
    wishlist_id: str,
    acquire_data: Optional[WishlistAcquireRequest] = None,
    _: bool = Depends(verify_library_key),
):
    """
    Transfers a purchased wishlist item into the Books collection as a new BOOK-XXX record,
    deleting it from the Wishlist tab.
    """
    data = acquire_data or WishlistAcquireRequest()
    new_book = await sheets_repo.acquire_wishlist_item(wishlist_id, data)
    if not new_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wishlist item '{wishlist_id}' not found",
        )
    return new_book
