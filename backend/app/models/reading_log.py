from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, model_validator

READING_LOGS_COLUMNS = [
    "log_id",
    "book_id",
    "session_date",
    "start_page",
    "end_page",
    "pages_read",
    "duration_minutes",
    "session_note",
    "created_at",
]


class ReadingLogCreate(BaseModel):
    book_id: str
    session_date: Optional[str] = None  # YYYY-MM-DD (defaults to today in Asia/Kolkata)
    start_page: int = Field(..., ge=1, description="Starting page of the reading session (1-indexed)")
    end_page: int = Field(..., ge=1, description="Ending page of the reading session (inclusive)")
    pages_read: Optional[int] = Field(None, ge=1)  # Defaults to (end_page - start_page) + 1
    duration_minutes: Optional[int] = Field(0, ge=0)
    session_note: Optional[str] = None
    finished_book: Optional[bool] = False  # If True, transitions book reading_status to COMPLETED
    rating: Optional[int] = Field(None, ge=1, le=5)  # Optional rating if finished

    @model_validator(mode="after")
    def validate_page_range(self) -> "ReadingLogCreate":
        if self.end_page < self.start_page:
            raise ValueError(
                f"end_page ({self.end_page}) cannot be less than start_page ({self.start_page})"
            )
        if self.pages_read is None:
            self.pages_read = (self.end_page - self.start_page) + 1
        return self


class ReadingLog(BaseModel):
    log_id: str
    book_id: str
    session_date: str
    start_page: int
    end_page: int
    pages_read: int
    duration_minutes: int
    session_note: Optional[str] = None
    created_at: str

    @classmethod
    def from_sheet_row(cls, row_dict: Dict[str, Any]) -> "ReadingLog":
        start = int(float(str(row_dict.get("start_page", 0) or 0)))
        end = int(float(str(row_dict.get("end_page", 0) or 0)))
        calc_pages = (end - start + 1) if (end >= start and start >= 1) else max(0, end - start)
        raw_pages = row_dict.get("pages_read")
        pages = int(float(str(raw_pages))) if raw_pages is not None and str(raw_pages).strip() != "" else calc_pages
        duration = int(float(str(row_dict.get("duration_minutes", 0) or 0)))

        return cls(
            log_id=str(row_dict.get("log_id", "")).strip(),
            book_id=str(row_dict.get("book_id", "")).strip(),
            session_date=str(row_dict.get("session_date", "")).strip(),
            start_page=start,
            end_page=end,
            pages_read=max(0, pages),
            duration_minutes=max(0, duration),
            session_note=str(row_dict.get("session_note", "")).strip() or None,
            created_at=str(row_dict.get("created_at") or datetime.utcnow().strftime("%Y-%m-%d")),
        )

    def to_sheet_row(self) -> List[Any]:
        return [
            self.log_id,
            self.book_id,
            self.session_date,
            self.start_page,
            self.end_page,
            self.pages_read,
            self.duration_minutes,
            self.session_note or "",
            self.created_at,
        ]
