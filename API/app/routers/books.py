from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.core.security import get_current_owner
from app.models.book import Book, BookCreate, BookUpdate
from app.models.responses import ApiResponse
from app.services.sheets_service import sheets_service

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=ApiResponse[List[Book]])
async def list_books(
    search: Optional[str] = Query(None, description="Search in title, author, isbn, notes"),
    ownership: Optional[str] = Query(None, description="Filter by ownership status"),
    reading: Optional[str] = Query(None, description="Filter by reading status"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    on_loan: Optional[bool] = Query(None, description="Filter books currently loaned out"),
):
    """
    Retrieves the entire collection in one batched Google Sheets read.
    Filtering can be performed client-side or optionally passed as query params.
    """
    books = await sheets_service.list_books()

    # Optional server-side filtering
    if search:
        q = search.lower()
        books = [
            b for b in books
            if q in b.title.lower()
            or (b.author and q in b.author.lower())
            or (b.isbn_13 and q in b.isbn_13)
            or (b.notes and q in b.notes.lower())
        ]
    if ownership:
        books = [b for b in books if b.ownership_status.value == ownership or b.ownership_status == ownership]
    if reading:
        books = [b for b in books if b.reading_status.value == reading or b.reading_status == reading]
    if genre:
        books = [b for b in books if b.genre and b.genre.lower() == genre.lower()]
    if on_loan is not None:
        books = [b for b in books if bool(b.loaned_to) == on_loan]

    return ApiResponse(data=books, meta={"total": len(books)})


@router.get("/{book_id}", response_model=Book)
async def get_book(book_id: str):
    """Retrieves a single book record by stable Book_ID."""
    book = await sheets_service.get_book(book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return book


@router.post("", response_model=Book, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_in: BookCreate,
    _: bool = Depends(get_current_owner),
):
    """Appends a new book to the library spreadsheet."""
    created = await sheets_service.create_book(book_in)
    return created


@router.patch("/{book_id}", response_model=Book)
async def update_book(
    book_id: str,
    updates: BookUpdate,
    _: bool = Depends(get_current_owner),
):
    """Performs a targeted update for the specific book row."""
    updated = await sheets_service.update_book(book_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return updated


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: str,
    _: bool = Depends(get_current_owner),
):
    """Deletes or clears a book record from the spreadsheet."""
    success = await sheets_service.delete_book(book_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{book_id}' not found",
        )
    return None

