from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.middleware import verify_library_key
from app.models.lending import LendingRecord, LendingRecordCreate, LendingRecordReturn
from app.repositories.sheets_repository import sheets_repo

router = APIRouter(prefix="/lending", tags=["Lending"])


@router.get("", response_model=List[LendingRecord])
async def list_lending(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE or RETURNED"),
    refresh: bool = Query(False, description="Bypass cache and force refresh from Google Sheets"),
):
    """Returns lending records from Google Sheets (or memory cache)."""
    return await sheets_repo.list_lending(status=status, force_refresh=refresh)


@router.get("/active", response_model=List[LendingRecord])
async def list_active_lending():
    """Returns only currently active (unreturned) lent book records."""
    return await sheets_repo.list_lending(status="ACTIVE")


@router.get("/book/{book_id}", response_model=Optional[LendingRecord])
async def get_active_lending_for_book(book_id: str):
    """Returns the currently active lending record for a given book, if any."""
    record = await sheets_repo.get_active_lending_for_book(book_id)
    return record


@router.post("", response_model=LendingRecord, status_code=status.HTTP_201_CREATED)
async def lend_book(
    payload: LendingRecordCreate,
    _: bool = Depends(verify_library_key),
):
    """
    Records a book being lent out to a borrower.
    Automatically updates the book's shelf location to 'Lent to {borrower_name}'.
    """
    # Verify book exists
    books = await sheets_repo.list_books()
    matched_book = next((b for b in books if b.book_id == payload.book_id), None)
    if not matched_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{payload.book_id}' does not exist",
        )

    # Check if book is already lent out
    active_record = await sheets_repo.get_active_lending_for_book(payload.book_id)
    if active_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book '{matched_book.title}' is already lent to {active_record.borrower_name} ({active_record.lending_id})",
        )

    return await sheets_repo.create_lending_record(payload)


@router.post("/{lending_id}/return", response_model=LendingRecord)
async def return_book(
    lending_id: str,
    return_data: Optional[LendingRecordReturn] = None,
    _: bool = Depends(verify_library_key),
):
    """
    Marks a lent book as returned.
    Restores the book's shelf location back to 'Home Shelf' (or specified return_location).
    """
    data = return_data or LendingRecordReturn()
    updated = await sheets_repo.return_lending_record(lending_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lending record '{lending_id}' not found",
        )
    return updated

