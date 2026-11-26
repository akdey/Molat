# backend/app/features/alcoves/models.py
import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from app.features.books.models import BookCondition, ReadingStatus


class AlcoveCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120, description="Name of the shared household Alcove")


class AlcoveJoinRequest(BaseModel):
    invite_code: str = Field(..., min_length=4, max_length=24)


class AlcoveEmailInviteRequest(BaseModel):
    identifier: Optional[str] = Field(None, description="Reader handle (ex/username) or external email")
    email: Optional[str] = Field(None, description="Legacy email field")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip().lower()
        if not s:
            return None
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", s):
            raise ValueError("Invalid email format")
        return s


class ReaderLookupItem(BaseModel):
    user_id: str
    username: str
    email_verified: bool = False


class AlcoveAutoShareRequest(BaseModel):
    auto_share: bool
    apply_to_existing: bool = True


class UserBookStateUpdate(BaseModel):
    reading_status: Optional[ReadingStatus] = None
    current_page: Optional[int] = Field(None, ge=0)
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class BookHolderUpdate(BaseModel):
    held_by_label: Optional[str] = Field(None, max_length=100)


class BookShareToggle(BaseModel):
    shared: bool


class AlcoveMemberResponse(BaseModel):
    user_id: str
    username: str
    role: str
    auto_share: bool
    joined_at: str


class AlcoveInviteResponse(BaseModel):
    id: str
    alcove_id: str
    alcove_name: Optional[str] = None
    invited_by_username: Optional[str] = None
    invitee_email: str
    invite_code: str
    status: str
    created_at: str


class AlcoveSummary(BaseModel):
    id: str
    name: str
    invite_code: str
    created_by: str
    my_role: str
    my_auto_share: bool
    created_at: str
    members: List[AlcoveMemberResponse] = Field(default_factory=list)
    sent_invites: List[AlcoveInviteResponse] = Field(default_factory=list)


class AlcoveBookItem(BaseModel):
    book_id: str
    owner_user_id: str
    owner_username: str
    alcove_id: str
    title: str
    subtitle: Optional[str] = None
    authors: Optional[str] = None
    isbn_10: Optional[str] = None
    isbn_13: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    language: Optional[str] = "English"
    genres: List[str] = Field(default_factory=list)
    cover_url: Optional[str] = None
    condition: BookCondition = BookCondition.GOOD
    location: Optional[str] = "Home Shelf"
    held_by_label: Optional[str] = None
    # Personal reading journey for the currently authenticated member
    my_reading_status: ReadingStatus = ReadingStatus.UNREAD
    my_current_page: int = 0
    my_rating: Optional[int] = None
    my_notes: Optional[str] = None


class AlcoveOverviewResponse(BaseModel):
    alcoves: List[AlcoveSummary] = Field(default_factory=list)
    shared_books: List[AlcoveBookItem] = Field(default_factory=list)
    pending_invites_for_me: List[AlcoveInviteResponse] = Field(default_factory=list)
