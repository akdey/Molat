from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator


class OwnershipStatus(str, Enum):
    OWNED = "Owned"
    WISHLIST = "Wishlist"
    BORROWED = "Borrowed"


class ReadingStatus(str, Enum):
    UNREAD = "Unread"
    READING = "Reading"
    COMPLETED = "Completed"
    ABANDONED = "Abandoned"


class BookCondition(str, Enum):
    NEW = "New"
    GOOD = "Good"
    FAIR = "Fair"
    DAMAGED = "Damaged"
    UNKNOWN = "Unknown"


# Documented 31 columns for the Google Sheet
SHEET_COLUMNS = [
    "Book_ID",
    "Title",
    "Subtitle",
    "Author",
    "ISBN_13",
    "ISBN_10",
    "Publisher",
    "Publication_Year",
    "Language",
    "Genre",
    "Ownership_Status",
    "Reading_Status",
    "Current_Page",
    "Total_Pages",
    "Purchase_Price",
    "Retail_Price",
    "Purchase_Date",
    "Purchase_Source",
    "Condition",
    "Shelf_Location",
    "Loaned_To",
    "Loan_Date",
    "Expected_Return_Date",
    "Personal_Rating",
    "Notes",
    "Cover_URL",
    "Cover_Source",
    "Metadata_Verified",
    "Created_At",
    "Updated_At",
    "Row_Version",
]


class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    subtitle: Optional[str] = None
    author: Optional[str] = None
    isbn_13: Optional[str] = None
    isbn_10: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    language: Optional[str] = None
    genre: Optional[str] = None
    ownership_status: OwnershipStatus = OwnershipStatus.OWNED
    reading_status: ReadingStatus = ReadingStatus.UNREAD
    current_page: Optional[int] = Field(None, ge=0)
    total_pages: Optional[int] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, ge=0.0)
    retail_price: Optional[float] = Field(None, ge=0.0)
    purchase_date: Optional[str] = None
    purchase_source: Optional[str] = None
    condition: BookCondition = BookCondition.UNKNOWN
    shelf_location: Optional[str] = None
    loaned_to: Optional[str] = None
    loan_date: Optional[str] = None
    expected_return_date: Optional[str] = None
    personal_rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    cover_source: Optional[str] = None
    metadata_verified: bool = False

    @field_validator("isbn_13", "isbn_10", mode="before")
    @classmethod
    def clean_isbn(cls, v: Any) -> Optional[str]:
        if v is None or v == "":
            return None
        return str(v).replace("-", "").replace(" ", "").strip()


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    author: Optional[str] = None
    isbn_13: Optional[str] = None
    isbn_10: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    language: Optional[str] = None
    genre: Optional[str] = None
    ownership_status: Optional[OwnershipStatus] = None
    reading_status: Optional[ReadingStatus] = None
    current_page: Optional[int] = Field(None, ge=0)
    total_pages: Optional[int] = Field(None, gt=0)
    purchase_price: Optional[float] = Field(None, ge=0.0)
    retail_price: Optional[float] = Field(None, ge=0.0)
    purchase_date: Optional[str] = None
    purchase_source: Optional[str] = None
    condition: Optional[BookCondition] = None
    shelf_location: Optional[str] = None
    loaned_to: Optional[str] = None
    loan_date: Optional[str] = None
    expected_return_date: Optional[str] = None
    personal_rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    cover_url: Optional[str] = None
    cover_source: Optional[str] = None
    metadata_verified: Optional[bool] = None


class Book(BookBase):
    book_id: str
    created_at: str
    updated_at: str
    row_version: int = 1

    @classmethod
    def from_sheet_row(cls, row_dict: Dict[str, Any]) -> "Book":
        """Converts a spreadsheet column dict into a typed Book object."""
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
                return float(str(val).replace(",", "").strip())
            except (ValueError, TypeError):
                return None

        def parse_bool(val: Any) -> bool:
            if isinstance(val, bool):
                return val
            return str(val).strip().lower() in ("true", "1", "yes", "y")

        return cls(
            book_id=str(row_dict.get("Book_ID", "")),
            title=str(row_dict.get("Title", "Untitled")),
            subtitle=row_dict.get("Subtitle") or None,
            author=row_dict.get("Author") or None,
            isbn_13=str(row_dict.get("ISBN_13", "")).strip() or None,
            isbn_10=str(row_dict.get("ISBN_10", "")).strip() or None,
            publisher=row_dict.get("Publisher") or None,
            publication_year=parse_int(row_dict.get("Publication_Year")),
            language=row_dict.get("Language") or None,
            genre=row_dict.get("Genre") or None,
            ownership_status=row_dict.get("Ownership_Status") or OwnershipStatus.OWNED,
            reading_status=row_dict.get("Reading_Status") or ReadingStatus.UNREAD,
            current_page=parse_int(row_dict.get("Current_Page")),
            total_pages=parse_int(row_dict.get("Total_Pages")),
            purchase_price=parse_float(row_dict.get("Purchase_Price")),
            retail_price=parse_float(row_dict.get("Retail_Price")),
            purchase_date=row_dict.get("Purchase_Date") or None,
            purchase_source=row_dict.get("Purchase_Source") or None,
            condition=row_dict.get("Condition") or BookCondition.UNKNOWN,
            shelf_location=row_dict.get("Shelf_Location") or None,
            loaned_to=row_dict.get("Loaned_To") or None,
            loan_date=row_dict.get("Loan_Date") or None,
            expected_return_date=row_dict.get("Expected_Return_Date") or None,
            personal_rating=parse_int(row_dict.get("Personal_Rating")),
            notes=row_dict.get("Notes") or None,
            cover_url=row_dict.get("Cover_URL") or None,
            cover_source=row_dict.get("Cover_Source") or None,
            metadata_verified=parse_bool(row_dict.get("Metadata_Verified")),
            created_at=row_dict.get("Created_At") or datetime.utcnow().isoformat(),
            updated_at=row_dict.get("Updated_At") or datetime.utcnow().isoformat(),
            row_version=parse_int(row_dict.get("Row_Version")) or 1,
        )

    def to_sheet_row(self) -> List[Any]:
        """Converts to values ordered according to SHEET_COLUMNS."""
        return [
            self.book_id,
            self.title,
            self.subtitle or "",
            self.author or "",
            self.isbn_13 or "",
            self.isbn_10 or "",
            self.publisher or "",
            self.publication_year if self.publication_year is not None else "",
            self.language or "",
            self.genre or "",
            self.ownership_status.value if hasattr(self.ownership_status, "value") else str(self.ownership_status),
            self.reading_status.value if hasattr(self.reading_status, "value") else str(self.reading_status),
            self.current_page if self.current_page is not None else "",
            self.total_pages if self.total_pages is not None else "",
            self.purchase_price if self.purchase_price is not None else "",
            self.retail_price if self.retail_price is not None else "",
            self.purchase_date or "",
            self.purchase_source or "",
            self.condition.value if hasattr(self.condition, "value") else str(self.condition),
            self.shelf_location or "",
            self.loaned_to or "",
            self.loan_date or "",
            self.expected_return_date or "",
            self.personal_rating if self.personal_rating is not None else "",
            self.notes or "",
            self.cover_url or "",
            self.cover_source or "",
            "TRUE" if self.metadata_verified else "FALSE",
            self.created_at,
            self.updated_at,
            self.row_version,
        ]

