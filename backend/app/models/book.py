from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class ReadingStatus(str, Enum):
    UNREAD = "UNREAD"
    READING = "READING"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"
    ABANDONED = "ABANDONED"


class BookCondition(str, Enum):
    NEW = "New"
    GOOD = "Good"
    FAIR = "Fair"
    DAMAGED = "Damaged"


# Exact 21-column schema matching Google Sheets Tab 1: Books (A1:U1)
BOOKS_SCHEMA_COLUMNS = [
    "book_id",
    "title",
    "subtitle",
    "authors",
    "isbn_10",
    "isbn_13",
    "publisher",
    "publication_year",
    "language",
    "genre",
    "cover_url",
    "reading_status",
    "condition",
    "location",
    "purchase_price",
    "rp",
    "purchase_date",
    "rating",
    "notes",
    "created_at",
    "updated_at",
]


class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    subtitle: Optional[str] = None
    authors: Optional[str] = None
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    language: Optional[str] = "English"
    genre: Optional[str] = None
    cover_url: Optional[str] = None
    reading_status: ReadingStatus = ReadingStatus.UNREAD
    condition: BookCondition = BookCondition.GOOD
    location: Optional[str] = "Home Shelf"
    purchase_price: Optional[float] = Field(None, ge=0.0)  # Cost Price (CP)
    rp: Optional[float] = Field(None, ge=0.0)              # Verified Retail Price / MRP
    purchase_date: Optional[str] = None                    # YYYY-MM-DD
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None

    @field_validator("isbn_10", "isbn_13", mode="before")
    @classmethod
    def clean_isbn(cls, v: Any) -> Optional[str]:
        if v is None or v == "":
            return None
        cleaned = str(v).replace("-", "").replace(" ", "").strip()
        if cleaned.startswith("'"):
            cleaned = cleaned[1:]
        return cleaned or None


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    authors: Optional[str] = None
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    language: Optional[str] = None
    genre: Optional[str] = None
    cover_url: Optional[str] = None
    reading_status: Optional[ReadingStatus] = None
    condition: Optional[BookCondition] = None
    location: Optional[str] = None
    purchase_price: Optional[float] = Field(None, ge=0.0)
    rp: Optional[float] = Field(None, ge=0.0)
    purchase_date: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class Book(BookBase):
    book_id: str
    created_at: str
    updated_at: str

    @classmethod
    def from_sheet_row(cls, row_dict: Dict[str, Any]) -> "Book":
        """Builds a Book instance from a Google Sheet row dict."""
        def parse_int(val: Any) -> Optional[int]:
            if val is None or val == "":
                return None
            try:
                return int(float(str(val).strip()))
            except (ValueError, TypeError):
                return None

        def parse_float(val: Any) -> Optional[float]:
            if val is None or val == "":
                return None
            try:
                cleaned = str(val).replace(",", "").replace("₹", "").strip()
                return float(cleaned)
            except (ValueError, TypeError):
                return None

        def clean_str(val: Any) -> Optional[str]:
            if val is None:
                return None
            s = str(val).strip()
            if s.startswith("'"):
                s = s[1:]
            return s if s != "" else None

        # Resolve reading status safely
        raw_status = str(row_dict.get("reading_status", "")).strip().upper()
        status_map = {
            "UNREAD": ReadingStatus.UNREAD,
            "READING": ReadingStatus.READING,
            "COMPLETED": ReadingStatus.COMPLETED,
            "PAUSED": ReadingStatus.PAUSED,
            "ABANDONED": ReadingStatus.ABANDONED,
        }
        resolved_status = status_map.get(raw_status, ReadingStatus.UNREAD)

        # Resolve condition safely
        raw_condition = str(row_dict.get("condition", "")).strip().capitalize()
        condition_map = {
            "New": BookCondition.NEW,
            "Good": BookCondition.GOOD,
            "Fair": BookCondition.FAIR,
            "Damaged": BookCondition.DAMAGED,
        }
        resolved_condition = condition_map.get(raw_condition, BookCondition.GOOD)

        return cls(
            book_id=str(row_dict.get("book_id", "")).strip(),
            title=str(row_dict.get("title", "Untitled")).strip(),
            subtitle=clean_str(row_dict.get("subtitle")),
            authors=clean_str(row_dict.get("authors")),
            isbn_10=clean_str(row_dict.get("isbn_10")),
            isbn_13=clean_str(row_dict.get("isbn_13")),
            publisher=clean_str(row_dict.get("publisher")),
            publication_year=parse_int(row_dict.get("publication_year")),
            language=clean_str(row_dict.get("language")) or "English",
            genre=clean_str(row_dict.get("genre")),
            cover_url=clean_str(row_dict.get("cover_url")),
            reading_status=resolved_status,
            condition=resolved_condition,
            location=clean_str(row_dict.get("location")) or "Home Shelf",
            purchase_price=parse_float(row_dict.get("purchase_price")),
            rp=parse_float(row_dict.get("rp")),
            purchase_date=clean_str(row_dict.get("purchase_date")),
            rating=parse_int(row_dict.get("rating")),
            notes=clean_str(row_dict.get("notes")),
            created_at=str(row_dict.get("created_at") or datetime.utcnow().strftime("%Y-%m-%d")),
            updated_at=str(row_dict.get("updated_at") or datetime.utcnow().strftime("%Y-%m-%d")),
        )

    def to_sheet_row(self) -> List[Any]:
        """Converts to exact 21 values ordered by BOOKS_SCHEMA_COLUMNS."""
        return [
            self.book_id,
            self.title,
            self.subtitle or "",
            self.authors or "",
            f"'{self.isbn_10}" if self.isbn_10 else "",
            f"'{self.isbn_13}" if self.isbn_13 else "",
            self.publisher or "",
            self.publication_year if self.publication_year is not None else "",
            self.language or "",
            self.genre or "",
            self.cover_url or "",
            self.reading_status.value,
            self.condition.value,
            self.location or "",
            self.purchase_price if self.purchase_price is not None else "",
            self.rp if self.rp is not None else "",
            self.purchase_date or "",
            self.rating if self.rating is not None else "",
            self.notes or "",
            self.created_at,
            self.updated_at,
        ]
