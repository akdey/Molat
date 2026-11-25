# backend/app/features/lending/router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user_id, require_authenticated_user
from app.features.lending.models import LendingRecord, LendingRecordCreate, LendingRecordReturn
from app.features.lending.repository import LendingRepository
from app.features.lending.dependencies import get_lending_repository
from app.features.books.repository import BookRepository
from app.features.books.dependencies import get_book_repository

router = APIRouter(prefix="/lending", tags=["Lending"])


@router.get("", response_model=List[LendingRecord])
async def list_lending(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE or RETURNED"),
    refresh: bool = Query(False, description="Bypass cache and force refresh"),
    lending_repo: LendingRepository = Depends(get_lending_repository),
    user_id: str = Depends(get_current_user_id),
):
    """Returns lending records for current user."""
    return await lending_repo.list(status=status, user_id=user_id, force_refresh=refresh)


@router.get("/active", response_model=List[LendingRecord])
async def list_active_lending(
    lending_repo: LendingRepository = Depends(get_lending_repository),
    user_id: str = Depends(get_current_user_id),
):
    """Returns only currently active (unreturned) lent book records."""
    return await lending_repo.list(status="ACTIVE", user_id=user_id)


@router.get("/book/{book_id}", response_model=Optional[LendingRecord])
async def get_active_lending_for_book(
    book_id: str,
    lending_repo: LendingRepository = Depends(get_lending_repository),
    user_id: str = Depends(get_current_user_id),
):
    """Returns the currently active lending record for a given book, if any."""
    return await lending_repo.get_active_for_book(book_id, user_id=user_id)


@router.post("", response_model=LendingRecord, status_code=status.HTTP_201_CREATED)
async def lend_book(
    payload: LendingRecordCreate,
    lending_repo: LendingRepository = Depends(get_lending_repository),
    book_repo: BookRepository = Depends(get_book_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Records a book being lent out and updates book location."""
    book = await book_repo.get(payload.book_id, user_id=user_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID '{payload.book_id}' does not exist",
        )

    active_record = await lending_repo.get_active_for_book(payload.book_id, user_id=user_id)
    if active_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book '{book.title}' is already lent to {active_record.borrower_name} ({active_record.lending_id})",
        )

    return await lending_repo.create(payload, user_id=user_id)


@router.post("/{lending_id}/return", response_model=LendingRecord)
async def return_book(
    lending_id: str,
    return_data: Optional[LendingRecordReturn] = None,
    lending_repo: LendingRepository = Depends(get_lending_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Marks a lent book as returned and restores its location."""
    data = return_data or LendingRecordReturn()
    updated = await lending_repo.return_book(lending_id, data, user_id=user_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lending record '{lending_id}' not found",
        )
    return updated


@router.delete("/{lending_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lending_record(
    lending_id: str,
    lending_repo: LendingRepository = Depends(get_lending_repository),
    user_id: str = Depends(require_authenticated_user),
):
    """Deletes a lending record."""
    await lending_repo.delete(lending_id, user_id=user_id)
    return None
