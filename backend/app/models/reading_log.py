from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

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
    session_date: Optional[str] = None  # YYYY-MM-DD
    start_page: int = Field(..., ge=0)
    end_page: int = Field(..., ge=0)
    duration_minutes: Optional[int] = Field(0, ge=0)
    session_note: Optional[str] = None
    is_finished: Optional[bool] = False  # If True, prompts transition to COMPLETED


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
        pages = int(float(str(row_dict.get("pages_read", end - start) or (end - start))))
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
