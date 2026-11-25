# backend/app/features/books/service.py
from typing import List, Optional, Dict
from app.features.books.models import Book, PortfolioSummary
from app.features.books.cover_enrichment import cover_enricher


def calculate_portfolio_summary(books: List[Book]) -> PortfolioSummary:
    """Computes total cost price, retail price, total savings, and discount percentage."""
    total_cp = sum(b.purchase_price or 0.0 for b in books)
    total_rp = sum(b.rp or 0.0 for b in books)
    total_saved = max(0.0, total_rp - total_cp)
    discount_pct = round((total_saved / total_rp * 100), 2) if total_rp > 0 else 0.0

    return PortfolioSummary(
        total_cp=round(total_cp, 2),
        total_rp=round(total_rp, 2),
        total_saved=round(total_saved, 2),
        discount_pct=discount_pct,
        total_books=len(books),
    )


def filter_books(
    books: List[Book],
    search: Optional[str] = None,
    reading_status: Optional[str] = None,
    genre: Optional[str] = None,
    location: Optional[str] = None,
) -> List[Book]:
    """Filters books in-memory based on optional query criteria."""
    filtered = books
    if search:
        q = search.lower().strip()
        filtered = [
            b for b in filtered
            if q in b.title.lower()
            or (b.authors and q in b.authors.lower())
            or (b.isbn_13 and q in b.isbn_13)
            or (b.isbn_10 and q in b.isbn_10)
            or (b.notes and q in b.notes.lower())
        ]
    if reading_status:
        rs = reading_status.upper().strip()
        filtered = [b for b in filtered if b.reading_status.value == rs or b.reading_status == rs]
    if genre:
        g = genre.lower().strip()
        filtered = [
            b for b in filtered
            if b.genre and g in [part.strip().lower() for part in b.genre.split(",") if part.strip()]
        ]
    if location:
        loc = location.lower().strip()
        filtered = [b for b in filtered if b.location and b.location.lower() == loc]

    return filtered
