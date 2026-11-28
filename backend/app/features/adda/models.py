# backend/app/features/adda/models.py
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


PostType = Literal["note", "quote", "review", "discussion"]
VisibilityType = Literal["public", "alcove"]
ReactionType = Literal["resonated", "reading_too", "wishlisted"]


class AddaPostCreate(BaseModel):
    post_type: PostType = "note"
    visibility: VisibilityType = "public"
    alcove_id: Optional[str] = None
    book_id: Optional[str] = None
    book_title: Optional[str] = Field(default=None, max_length=500)
    book_authors: Optional[str] = Field(default=None, max_length=500)
    book_cover_url: Optional[str] = None
    page_number: Optional[int] = Field(default=None, ge=1, le=50000)
    content: str = Field(..., min_length=1, max_length=2500)
    has_spoiler: bool = False


class AddaCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


class AddaReactionToggle(BaseModel):
    reaction_type: ReactionType


class AddaCommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    username: str
    content: str
    created_at: str


class AddaPostResponse(BaseModel):
    id: str
    user_id: str
    username: str
    post_type: str
    visibility: str
    alcove_id: Optional[str] = None
    book_id: Optional[str] = None
    book_title: Optional[str] = None
    book_authors: Optional[str] = None
    book_cover_url: Optional[str] = None
    page_number: Optional[int] = None
    content: str
    has_spoiler: bool = False
    created_at: str
    reaction_counts: Dict[str, int] = Field(default_factory=dict)
    my_reactions: List[str] = Field(default_factory=list)
    comments: List[AddaCommentResponse] = Field(default_factory=list)


class AddaFeedResponse(BaseModel):
    posts: List[AddaPostResponse]
