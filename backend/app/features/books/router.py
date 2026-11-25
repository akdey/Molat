# backend/app/features/books/router.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user_id, require_authenticated_user
from app.features.books.models import Book, BookCreate, BookUpdate
from app.features.books.repository import BookRepository
from app.features.books.dependencies import get_book_repository
from app.core.responses import BookListResponse, EnrichCoversResponse
from app.features.books.service import calculate_portfolio_summary, filter_books
from app.features.books.cover_enrichment import cover_enricher

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=BookListResponse)
async def list_books(
    search: Optional[str] = Query(None, description="Search in title, authors, notes, ISBN"),
    reading_status: Optional[str] = Query(None, description="Filter by reading status (UNREAD, READING, etc.)"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    location: Optional[str] = Query(None, description="Filter by shelf location"),
    refresh: bool = Query(False, description="Bypass cache and force refresh"),
    book_repo: BookRepository = Depends(get_book_repository),
    user_id: str = Depends(get_current_user_id),
):
    """Returns all books for the current user and financial portfolio statistics."""
    books = await book_repo.list(user_id=user_id, force_refresh=refresh)
    filtered = filter_books(books, search=search, reading_status=reading_status, genre=genre, location=location)
    portfolio = calculate_portfolio_summary(filtered)
    return BookListResponse(books=filtered, portfolio=portfolio)


@router.get("/{book_id}", response_model=Book)
async def get_book(
    book_id: str,
    book_repo: BookRepository = Depends(get_book_repository),
    user_id: str = Depends(get_current_user_id),
):
    """Fetches a single book by book_id."""
    book = await book_repo.get(book_id, user_id=user_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return book


@router.post("", response_model=Book, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_in: BookCreate,
    book_repo: BookRepository = Depends(get_book_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Appends a new book to the user's personal catalogue."""
    return await book_repo.create(book_in, user_id=user_id)


@router.put("/{book_id}", response_model=Book)
@router.patch("/{book_id}", response_model=Book)
async def update_book(
    book_id: str,
    book_in: BookUpdate,
    book_repo: BookRepository = Depends(get_book_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Updates an existing book record."""
    updated = await book_repo.update(book_id, book_in, user_id=user_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return updated


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: str,
    book_repo: BookRepository = Depends(get_book_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Permanently deletes a book record from the catalogue."""
    deleted = await book_repo.delete(book_id, user_id=user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return None


@router.post("/enrich-covers", response_model=EnrichCoversResponse)
async def enrich_missing_covers(
    limit: int = Query(50, ge=1, le=100),
    book_repo: BookRepository = Depends(get_book_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Scans catalogue for books with missing covers and enriches them via multi-tier fallback."""
    books = await book_repo.list(user_id=user_id)
    missing = [b for b in books if not b.cover_url or b.cover_url.strip() == ""]
    target_books = missing[:limit]

    if not target_books:
        return EnrichCoversResponse(
            scanned=len(books),
            enriched=0,
            updated_books=[],
            message="All books in catalogue already have cover images.",
        )

    updated_pairs = []
    for b in target_books:
        cover = await cover_enricher.enrich(title=b.title, authors=b.authors, isbn_13=b.isbn_13, isbn_10=b.isbn_10)
        if cover:
            updated_pairs.append({"book_id": b.book_id, "cover_url": cover})

    if updated_pairs:
        await book_repo.batch_update_covers(updated_pairs, user_id=user_id)

    return EnrichCoversResponse(
        scanned=len(target_books),
        enriched=len(updated_pairs),
        updated_books=updated_pairs,
        message=f"Successfully enriched {len(updated_pairs)} of {len(target_books)} scanned books with covers.",
    )
