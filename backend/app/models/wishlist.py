from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.book import BookCondition

WISHLIST_COLUMNS = [
    "wishlist_id",
    "title",
    "authors",
    "isbn_13",
    "genre",
    "expected_rp",
    "target_price",
    "priority",
    "notes",
    "created_at",
]


class WishlistItemCreate(BaseModel):
    title: str = Field(..., min_length=1)
    authors: Optional[str] = None
    isbn_13: Optional[str] = None
    genre: Optional[str] = None
    expected_rp: Optional[float] = Field(None, ge=0.0)
    target_price: Optional[float] = Field(None, ge=0.0)
    priority: Optional[str] = "Normal"  # High, Normal, Low
    notes: Optional[str] = None


class WishlistAcquireRequest(BaseModel):
    purchase_price: Optional[float] = Field(None, ge=0.0)
    condition: Optional[BookCondition] = BookCondition.NEW
    location: Optional[str] = "Home Shelf"


class WishlistItem(BaseModel):
    wishlist_id: str
    title: str
    authors: Optional[str] = None
    isbn_13: Optional[str] = None
    genre: Optional[str] = None
    expected_rp: Optional[float] = None
    target_price: Optional[float] = None
    priority: str = "Normal"
    notes: Optional[str] = None
    created_at: str

    @classmethod
    def from_sheet_row(cls, row_dict: Dict[str, Any]) -> "WishlistItem":
        def parse_float(val: Any) -> Optional[float]:
            if val is None or val == "":
                return None
            try:
                return float(str(val).replace(",", "").replace("₹", "").strip())
            except (ValueError, TypeError):
                return None

        return cls(
            wishlist_id=str(row_dict.get("wishlist_id", "")).strip(),
            title=str(row_dict.get("title", "")).strip(),
            authors=str(row_dict.get("authors", "")).strip() or None,
            isbn_13=str(row_dict.get("isbn_13", "")).strip() or None,
            genre=str(row_dict.get("genre", "")).strip() or None,
            expected_rp=parse_float(row_dict.get("expected_rp")),
            target_price=parse_float(row_dict.get("target_price")),
            priority=str(row_dict.get("priority", "Normal")).strip(),
            notes=str(row_dict.get("notes", "")).strip() or None,
            created_at=str(row_dict.get("created_at") or datetime.utcnow().strftime("%Y-%m-%d")),
        )

    def to_sheet_row(self) -> List[Any]:
        return [
            self.wishlist_id,
            self.title,
            self.authors or "",
            f"'{self.isbn_13}" if self.isbn_13 else "",
            self.genre or "",
            self.expected_rp if self.expected_rp is not None else "",
            self.target_price if self.target_price is not None else "",
            self.priority,
            self.notes or "",
            self.created_at,
        ]
