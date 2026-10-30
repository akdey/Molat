from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.middleware import verify_library_key
from app.models.reading_log import ReadingLog, ReadingLogCreate
from app.models.responses import StreakSummaryResponse
from app.repositories.sheets_repository import sheets_repo
from app.services.streak_calculator import calculate_streak_summary

router = APIRouter(prefix="/reading", tags=["Reading & Streak Engine"])


@router.get("/streak-summary", response_model=StreakSummaryResponse)
async def get_streak_summary(
    goal: int = Query(20, ge=1, description="Daily reading goal in pages"),
):
    """
    Computes current streak, longest streak, risk state, grace freeze,
    velocity (14-day rolling avg), and 365-day heatmap normalized to Asia/Kolkata (IST).
    """
    logs = await sheets_repo.list_reading_logs()
    return calculate_streak_summary(logs=logs, daily_goal_pages=goal)


@router.post("/logs", response_model=ReadingLog, status_code=status.HTTP_201_CREATED)
async def log_reading_session(
    log_in: ReadingLogCreate,
    _: bool = Depends(verify_library_key),
):
    """
    Appends a reading session to the Reading_Logs sheet.
    - Normalizes session_date to YYYY-MM-DD in Asia/Kolkata (IST).
    - Automatically transitions the target book's reading_status (UNREAD -> READING, or -> COMPLETED if finished).
    - Atomically updates cache within the write lock.
    """
    created_log = await sheets_repo.create_reading_log(log_in)
    return created_log


@router.get("/logs", response_model=List[ReadingLog])
async def list_reading_logs(
    book_id: Optional[str] = Query(None, description="Filter logs for a specific book"),
    limit: int = Query(50, ge=1, le=200),
):
    """Returns past reading sessions."""
    logs = await sheets_repo.list_reading_logs()
    if book_id:
        logs = [l for l in logs if l.book_id == book_id]
    return logs[:limit]
