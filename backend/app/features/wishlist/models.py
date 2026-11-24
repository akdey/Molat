# backend/app/features/wishlist/models.py
from typing import Optional
from pydantic import BaseModel, Field
from app.features.books.models import BookCondition

WISHLIST_COLUMNS = [
    "wishlist_id", "title", "authors", "isbn_13", "genre",
    "expected_rp", "target_price", "priority", "notes", "created_at",
]


class WishlistItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    authors: Optional[str] = None
    isbn_13: Optional[str] = None
    genre: Optional[str] = None
    expected_rp: Optional[float] = Field(None, ge=0.0)
    target_price: Optional[float] = Field(None, ge=0.0)
    priority: Optional[str] = "MEDIUM"
    notes: Optional[str] = None


class WishlistItemCreate(WishlistItemBase):
    pass


class WishlistAcquireRequest(BaseModel):
    purchase_price: Optional[float] = Field(None, ge=0.0)
    condition: Optional[BookCondition] = BookCondition.GOOD
    location: Optional[str] = "Home Shelf"


class WishlistItem(WishlistItemBase):
    wishlist_id: str
    user_id: str = "owner"
    created_at: Optional[str] = None
