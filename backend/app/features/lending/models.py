# backend/app/features/lending/models.py
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

LENDING_COLUMNS = [
    "lending_id", "book_id", "borrower_name", "borrower_contact",
    "lent_date", "due_date", "returned_date", "status", "notes", "created_at",
]


class LendingStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RETURNED = "RETURNED"


class LendingRecordBase(BaseModel):
    book_id: str = Field(..., min_length=1, max_length=50)
    borrower_name: str = Field(..., min_length=1, max_length=200)
    borrower_contact: Optional[str] = Field(None, max_length=100)
    lent_date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None


class LendingRecordCreate(LendingRecordBase):
    pass


class LendingRecordReturn(BaseModel):
    return_location: Optional[str] = "Home Shelf"
    notes: Optional[str] = None


class LendingRecord(LendingRecordBase):
    lending_id: str
    user_id: str = "owner"
    lent_date: str
    returned_date: Optional[str] = None
    status: LendingStatus = LendingStatus.ACTIVE
    created_at: Optional[str] = None

    book_title: Optional[str] = None
    book_authors: Optional[str] = None
    book_cover_url: Optional[str] = None
    is_overdue: bool = False
    days_lent: int = 0
