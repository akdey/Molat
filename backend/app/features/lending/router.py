# backend/app/features/lending/router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user_id, require_authenticated_user
from app.storage.provider import get_storage
from app.storage.base import StorageFactory
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn

router = APIRouter(prefix="/lending", tags=["Lending"])


@router.get("", response_model=List[LendingRecord])
async def list_lending(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE or RETURNED"),
    refresh: bool = Query(False, description="Bypass cache and force refresh"),
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Returns lending records for current user."""
    return await storage.lending.list(status=status, user_id=user_id, force_refresh=refresh)


@router.get("/active", response_model=List[LendingRecord])
async def list_active_lending(
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Returns only currently active (unreturned) lent book records."""
    return await storage.lending.list(status="ACTIVE", user_id=user_id)


@router.get("/book/{book_id}", response_model=Optional[LendingRecord])
async def get_active_lending_for_book(
    book_id: str,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Returns the currently active lending record for a given book, if any."""
    return await storage.lending.get_active_for_book(book_id, user_id=user_id)


@router.post("", response_model=LendingRecord, status_code=status.HTTP_201_CREATED)
async def lend_book(
    payload: LendingRecordCreate,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Records a book being lent out and updates book location."""
    books = await storage.books.list(user_id=user_id)
    matched_book = next((b for b in books if b.book_id == payload.book_id), None)
    if not matched_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{payload.book_id}' does not exist",
        )

    active_record = await storage.lending.get_active_for_book(payload.book_id, user_id=user_id)
    if active_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book '{matched_book.title}' is already lent to {active_record.borrower_name} ({active_record.lending_id})",
        )

    return await storage.lending.create(payload, user_id=user_id)


@router.post("/{lending_id}/return", response_model=LendingRecord)
async def return_book(
    lending_id: str,
    return_data: Optional[LendingRecordReturn] = None,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Marks a lent book as returned and restores its location."""
    data = return_data or LendingRecordReturn()
    updated = await storage.lending.return_book(lending_id, data, user_id=user_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lending record '{lending_id}' not found",
        )
    return updated
