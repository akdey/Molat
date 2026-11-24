# backend/app/features/reading/models.py
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

READING_LOGS_COLUMNS = [
    "log_id", "book_id", "session_date", "start_page", "end_page",
    "pages_read", "duration_minutes", "session_note", "created_at",
]


class ReadingLogCreate(BaseModel):
    book_id: str
    session_date: Optional[str] = None
    start_page: int = Field(..., ge=1, description="Starting page (1-indexed)")
    end_page: int = Field(..., ge=1, description="Ending page (inclusive)")
    pages_read: Optional[int] = Field(None, ge=1)
    duration_minutes: Optional[int] = Field(0, ge=0)
    session_note: Optional[str] = None
    finished_book: Optional[bool] = False
    rating: Optional[int] = Field(None, ge=1, le=5)

    @model_validator(mode="after")
    def validate_page_range(self) -> "ReadingLogCreate":
        if self.end_page < self.start_page:
            raise ValueError(f"end_page ({self.end_page}) cannot be less than start_page ({self.start_page})")
        if self.pages_read is None:
            self.pages_read = (self.end_page - self.start_page) + 1
        return self


class ReadingLog(BaseModel):
    log_id: str
    book_id: str
    user_id: str = "owner"
    session_date: str
    start_page: int
    end_page: int
    pages_read: int
    duration_minutes: int
    session_note: Optional[str] = None
    created_at: str
