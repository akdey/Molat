# backend/app/features/reading/router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.security import get_current_user_id, require_authenticated_user
from app.storage.provider import get_storage
from app.storage.base import StorageFactory
from app.features.reading.models import ReadingLog, ReadingLogCreate
from app.core.responses import StreakSummaryResponse
from app.features.reading.streak_calculator import calculate_streak_summary

router = APIRouter(prefix="/reading", tags=["Reading & Streak Engine"])


@router.get("/streak-summary", response_model=StreakSummaryResponse)
async def get_streak_summary(
    goal: Optional[int] = Query(None, ge=1, description="Daily reading goal in pages"),
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Computes streak, longest streak, risk state, grace freeze, velocity, and heatmap."""
    logs = await storage.reading.list(user_id=user_id)
    if goal is None:
        user_settings = await storage.settings.get(user_id=user_id)
        goal = user_settings.daily_goal_pages
    return calculate_streak_summary(logs=logs, daily_goal_pages=goal)


@router.post("/logs", response_model=ReadingLog, status_code=status.HTTP_201_CREATED)
async def log_reading_session(
    log_in: ReadingLogCreate,
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(require_authenticated_user),
):
    """Appends a reading session log and auto-transitions the book reading status."""
    return await storage.reading.create(log_in, user_id=user_id)


@router.get("/logs", response_model=List[ReadingLog])
async def list_reading_logs(
    book_id: Optional[str] = Query(None, description="Filter logs for a specific book"),
    limit: int = Query(50, ge=1, le=200),
    storage: StorageFactory = Depends(get_storage),
    user_id: str = Depends(get_current_user_id),
):
    """Returns past reading sessions for the current user."""
    logs = await storage.reading.list(user_id=user_id)
    if book_id:
        logs = [l for l in logs if l.book_id == book_id]
    return logs[:limit]
