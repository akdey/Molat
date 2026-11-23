from typing import Optional
from pydantic import BaseModel, Field


class UserSettings(BaseModel):
    daily_goal_pages: int = Field(default=15, ge=1, le=500, description="Daily reading target in pages")
    active_book_id: Optional[str] = Field(default=None, description="Current/last read book ID")
    theme: str = Field(default="light", description="Visual theme preference (light/dark)")
    updated_at: Optional[str] = None


class UserSettingsUpdate(BaseModel):
    daily_goal_pages: Optional[int] = Field(default=None, ge=1, le=500)
    active_book_id: Optional[str] = None
    theme: Optional[str] = None
