# backend/app/features/books/models.py
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator


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


# Google Sheets Tab Column Order (for sheets serialization)
BOOKS_SCHEMA_COLUMNS = [
    "book_id", "title", "subtitle", "authors", "isbn_10", "isbn_13",
    "publisher", "publication_year", "language", "genre", "cover_url",
    "reading_status", "condition", "location", "purchase_price", "rp",
    "purchase_date", "rating", "notes", "created_at", "updated_at",
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
    purchase_price: Optional[float] = Field(None, ge=0.0)
    rp: Optional[float] = Field(None, ge=0.0)
    purchase_date: Optional[str] = None
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

    @model_validator(mode="after")
    def sync_both_isbns(self) -> "BookBase":
        """Calculates ISBN-10 from ISBN-13 and vice-versa if only one is provided."""
        if self.isbn_13 and not self.isbn_10:
            clean13 = self.isbn_13.replace("-", "").replace(" ", "").strip()
            if len(clean13) == 13 and clean13.startswith("978"):
                core = clean13[3:12]
                s = sum(int(core[i]) * (10 - i) for i in range(9))
                rem = (11 - (s % 11)) % 11
                cd = "X" if rem == 10 else str(rem)
                self.isbn_10 = core + cd
        elif self.isbn_10 and not self.isbn_13:
            clean10 = self.isbn_10.replace("-", "").replace(" ", "").strip()
            if len(clean10) == 10:
                core = "978" + clean10[:9]
                s = sum(int(core[i]) * (1 if i % 2 == 0 else 3) for i in range(12))
                cd = str((10 - (s % 10)) % 10)
                self.isbn_13 = core + cd
        return self


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
    user_id: str = "owner"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
