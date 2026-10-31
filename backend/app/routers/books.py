from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.middleware import verify_library_key
from app.models.book import Book, BookCreate, BookUpdate
from app.models.responses import BookListResponse, EnrichCoversResponse
from app.repositories.sheets_repository import sheets_repo
from app.services.cover_enrichment import cover_enricher

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=BookListResponse)
async def list_books(
    search: Optional[str] = Query(None, description="Search in title, authors, notes, ISBN"),
    reading_status: Optional[str] = Query(None, description="Filter by reading status (UNREAD, READING, etc.)"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    location: Optional[str] = Query(None, description="Filter by shelf location"),
    refresh: bool = Query(False, description="Bypass cache and force refresh from Google Sheets"),
):
    """
    Returns all books from the 300s TTL cache (or fresh sheet fetch)
    plus the portfolio financial summary (total_cp, total_rp, total_saved, discount_pct).
    """
    books = await sheets_repo.list_books(force_refresh=refresh)
    portfolio = sheets_repo._get_portfolio_summary(books)

    # Optional server-side filtering
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

    return BookListResponse(books=filtered, portfolio=portfolio)


@router.get("/{book_id}", response_model=Book)
async def get_book(book_id: str):
    """Fetches a single book by book_id."""
    book = await sheets_repo.get_book(book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return book


@router.post("", response_model=Book, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_in: BookCreate,
    _: bool = Depends(verify_library_key),
):
    """
    Appends a new book record (BOOK-XXX) to the Google Sheet.
    Invalidates the 300s TTL cache.
    """
    created = await sheets_repo.create_book(book_in)
    return created


@router.patch("/{book_id}", response_model=Book)
async def update_book(
    book_id: str,
    updates: BookUpdate,
    _: bool = Depends(verify_library_key),
):
    """
    Updates specific fields of an existing book by book_id.
    Invalidates the 300s TTL cache.
    """
    updated = await sheets_repo.update_book(book_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return updated


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: str,
    _: bool = Depends(verify_library_key),
):
    """
    Deletes a book record from Google Sheets.
    Invalidates the 300s TTL cache.
    """
    success = await sheets_repo.delete_book(book_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return None


@router.post("/enrich-covers", response_model=EnrichCoversResponse)
async def enrich_covers(
    _: bool = Depends(verify_library_key),
):
    """
    Server-side background/batch task that scans for books with missing covers
    and resolves them through a multi-tier fallback pipeline:
    1. Google Books (ISBN)
    2. Google Books (Title + Author)
    3. Apple Books India (country=IN, 600x600 artwork)
    4. Apple Books Global (country=US)
    5. Open Library (ISBN cover_i)
    6. Open Library (Title + Author)
    7. Open Library Direct ISBN jacket URL
    writing found URLs back to Google Sheets Column K.
    """
    all_books = await sheets_repo.list_books()
    missing_count = sum(1 for b in all_books if not b.cover_url or b.cover_url.strip() == "")

    updates = await cover_enricher.enrich_missing_covers(all_books)
    updated_count = await sheets_repo.batch_update_covers(updates)

    return EnrichCoversResponse(
        scanned=missing_count,
        enriched=updated_count,
        updated_books=updates,
        message=f"Scanned {missing_count} books with missing covers. Enriched and updated {updated_count} covers.",
    )

