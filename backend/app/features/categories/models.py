# backend/app/features/categories/models.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=30)


class CategoryCreate(CategoryBase):
    pass


class Category(CategoryBase):
    id: str
    created_at: Optional[datetime] = None
