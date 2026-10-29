from typing import Optional, List
from pydantic import BaseModel


class MetadataCandidate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    author: Optional[str] = None
    isbn_13: Optional[str] = None
    isbn_10: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    language: Optional[str] = None
    genre: Optional[str] = None
    total_pages: Optional[int] = None
    retail_price: Optional[float] = None
    cover_url: Optional[str] = None
    cover_source: Optional[str] = None
    source: str  # "Open Library" or "Google Books"
    confidence: str = "exact"  # "exact", "partial", "uncertain"

