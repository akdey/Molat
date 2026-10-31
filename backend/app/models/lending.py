from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field

IST = ZoneInfo("Asia/Kolkata")


class LendingStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RETURNED = "RETURNED"


# Exact 10-column schema matching Google Sheets Tab: Lending
LENDING_COLUMNS = [
    "lending_id",
    "book_id",
    "borrower_name",
    "borrower_contact",
    "lent_date",
    "due_date",
    "returned_date",
    "status",
    "notes",
    "created_at",
]


class LendingRecordBase(BaseModel):
    book_id: str = Field(..., min_length=1, max_length=50)
    borrower_name: str = Field(..., min_length=1, max_length=200)
    borrower_contact: Optional[str] = Field(None, max_length=100)
    lent_date: Optional[str] = None  # YYYY-MM-DD
    due_date: Optional[str] = None   # YYYY-MM-DD
    notes: Optional[str] = None


class LendingRecordCreate(LendingRecordBase):
    pass


class LendingRecordReturn(BaseModel):
    return_location: Optional[str] = "Home Shelf"
    notes: Optional[str] = None


class LendingRecord(LendingRecordBase):
    lending_id: str
    lent_date: str
    returned_date: Optional[str] = None
    status: LendingStatus = LendingStatus.ACTIVE
    created_at: Optional[str] = None

    # Joined fields for UI convenience
    book_title: Optional[str] = None
    book_authors: Optional[str] = None
    book_cover_url: Optional[str] = None
    is_overdue: bool = False
    days_lent: int = 0

    @classmethod
    def from_sheet_row(cls, row: Dict[str, Any]) -> "LendingRecord":
        status_val = str(row.get("status") or "ACTIVE").upper().strip()
        status = LendingStatus.RETURNED if status_val == "RETURNED" else LendingStatus.ACTIVE

        lent_date_val = str(row.get("lent_date") or "").strip()
        if not lent_date_val:
            lent_date_val = datetime.now(IST).strftime("%Y-%m-%d")

        due_date_val = str(row.get("due_date") or "").strip() or None
        returned_date_val = str(row.get("returned_date") or "").strip() or None

        # Calculate days_lent and is_overdue
        today = datetime.now(IST).date()
        days_lent = 0
        try:
            l_d = datetime.strptime(lent_date_val, "%Y-%m-%d").date()
            if status == LendingStatus.ACTIVE:
                days_lent = max(0, (today - l_d).days)
            elif returned_date_val:
                r_d = datetime.strptime(returned_date_val, "%Y-%m-%d").date()
                days_lent = max(0, (r_d - l_d).days)
        except Exception:
            pass

        is_overdue = False
        if status == LendingStatus.ACTIVE and due_date_val:
            try:
                d_d = datetime.strptime(due_date_val, "%Y-%m-%d").date()
                if today > d_d:
                    is_overdue = True
            except Exception:
                pass

        return cls(
            lending_id=str(row.get("lending_id", "")),
            book_id=str(row.get("book_id", "")),
            borrower_name=str(row.get("borrower_name", "")),
            borrower_contact=str(row.get("borrower_contact", "")) or None,
            lent_date=lent_date_val,
            due_date=due_date_val,
            returned_date=returned_date_val,
            status=status,
            notes=str(row.get("notes", "")) or None,
            created_at=str(row.get("created_at", "")) or None,
            is_overdue=is_overdue,
            days_lent=days_lent,
        )

    def to_sheet_row(self) -> Dict[str, Any]:
        return {
            "lending_id": self.lending_id,
            "book_id": self.book_id,
            "borrower_name": self.borrower_name,
            "borrower_contact": self.borrower_contact or "",
            "lent_date": self.lent_date,
            "due_date": self.due_date or "",
            "returned_date": self.returned_date or "",
            "status": self.status.value,
            "notes": self.notes or "",
            "created_at": self.created_at or datetime.now(IST).isoformat(),
        }
