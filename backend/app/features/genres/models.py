# backend/app/features/genres/models.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class GenreBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=30)


class GenreCreate(GenreBase):
    pass


class Genre(GenreBase):
    id: str
    created_at: Optional[datetime] = None
