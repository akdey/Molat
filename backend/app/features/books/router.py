# backend/app/features/books/router.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user_id, require_authenticated_user
from app.storage.provider import get_storage
from app.storage.base import StorageFactory
from app.features.books.models import Book, BookCreate, BookUpdate
from app.models.responses import BookListResponse, EnrichCoversResponse
from app.features.books.service import calculate_portfolio_summary, filter_books
from app.services.cover_enrichment import cover_enricher

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=BookListResponse)
async def list_books(
    search: Optional[str] = Query(None, description="Search in title, authors, notes, ISBN"),
    reading_status: Optional[str] = Query(None, description="Filter by reading status (UNREAD, READING, etc.)"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    location: Optional[str] = Query(None, description="Filter by shelf location"),
    refresh: bool = Query(False, description="Bypass cache and force refresh"),
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Returns all books for the current user and financial portfolio statistics."""
    books = await storage.books.list(user_id=user_id, force_refresh=refresh)
    filtered = filter_books(books, search=search, reading_status=reading_status, genre=genre, location=location)
    portfolio = calculate_portfolio_summary(filtered)
    return BookListResponse(books=filtered, portfolio=portfolio)


@router.get("/{book_id}", response_model=Book)
async def get_book(
    book_id: str,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Fetches a single book by book_id."""
    book = await storage.books.get(book_id, user_id=user_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return book


@router.post("", response_model=Book, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_in: BookCreate,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Appends a new book record (BOOK-XXX) for the authenticated user."""
    return await storage.books.create(book_in, user_id=user_id)


@router.patch("/{book_id}", response_model=Book)
async def update_book(
    book_id: str,
    updates: BookUpdate,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Updates fields of an existing book by book_id."""
    updated = await storage.books.update(book_id, updates, user_id=user_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return updated


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: str,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Deletes a book record."""
    success = await storage.books.delete(book_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return None


@router.post("/enrich-covers", response_model=EnrichCoversResponse)
async def enrich_covers(
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Enriches books missing cover artwork using multi-tier fallback pipeline."""
    all_books = await storage.books.list(user_id=user_id)
    missing_count = sum(1 for b in all_books if not b.cover_url or b.cover_url.strip() == "")
    updates = await cover_enricher.enrich_missing_covers(all_books)
    updated_count = await storage.books.batch_update_covers(updates, user_id=user_id)
    return EnrichCoversResponse(
        scanned=missing_count,
        enriched=updated_count,
        updated_books=updates,
        message=f"Scanned {missing_count} books with missing covers. Enriched and updated {updated_count} covers.",
    )
