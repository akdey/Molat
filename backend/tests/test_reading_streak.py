from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.reading_log import ReadingLog, ReadingLogCreate
from app.models.book import BookCreate, ReadingStatus
from app.services.streak_calculator import calculate_streak_summary
from app.repositories.sheets_repository import sheets_repo

client = TestClient(app)
AUTH_HEADERS = {"X-Library-Key": "development-secret-key-change-in-production"}


def make_dummy_log(log_id: str, session_date: str, pages_read: int) -> ReadingLog:
    return ReadingLog(
        log_id=log_id,
        book_id="BOOK-001",
        session_date=session_date,
        start_page=0,
        end_page=pages_read,
        pages_read=pages_read,
        duration_minutes=30,
        session_note="test note",
        created_at=session_date,
    )


# ==================== STREAK ENGINE UNIT TESTS ====================

def test_streak_walk_continuous():
    ref_date = date(2026, 10, 30)
    # 5 consecutive days of 25 pages each
    logs = [
        make_dummy_log(f"LOG-{i}", (ref_date - timedelta(days=i)).strftime("%Y-%m-%d"), 25)
        for i in range(5)
    ]
    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    assert summary.current_streak_days == 5
    assert summary.longest_streak_days >= 5
    assert summary.streak_at_risk is False
    assert summary.today_pages == 25
    assert summary.grace_freeze_used is False


def test_streak_at_risk_when_today_is_zero():
    ref_date = date(2026, 10, 30)
    # Today has 0 pages, but yesterday and day before had reading
    logs = [
        make_dummy_log("LOG-1", (ref_date - timedelta(days=1)).strftime("%Y-%m-%d"), 30),
        make_dummy_log("LOG-2", (ref_date - timedelta(days=2)).strftime("%Y-%m-%d"), 30),
    ]
    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    assert summary.current_streak_days == 2
    assert summary.streak_at_risk is True
    assert summary.today_pages == 0


def test_grace_freeze_bridging_qualified():
    ref_date = date(2026, 10, 30)
    # Today active: 20 pages
    # Yesterday missed: 0 pages
    # Prior 7 days before yesterday (days 2 to 8): 20 pages each day = 140 pages (>= 100)
    logs = [make_dummy_log("LOG-TODAY", ref_date.strftime("%Y-%m-%d"), 20)]
    for d in range(2, 9):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 20))

    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Yesterday should be bridged by grace freeze
    # Streak includes today (1) + 7 previous days = 8 days
    assert summary.current_streak_days == 8
    assert summary.grace_freeze_used is True
    assert summary.streak_at_risk is False


def test_grace_freeze_rejected_insufficient_pages():
    ref_date = date(2026, 10, 30)
    # Today active: 20 pages
    # Yesterday missed: 0 pages
    # Prior 7 days had only 10 pages total (< 100)
    logs = [
        make_dummy_log("LOG-TODAY", ref_date.strftime("%Y-%m-%d"), 20),
        make_dummy_log("LOG-PAST", (ref_date - timedelta(days=2)).strftime("%Y-%m-%d"), 10),
    ]
    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Cannot bridge, streak is only today
    assert summary.current_streak_days == 1
    assert summary.grace_freeze_used is False


def test_grace_freeze_rejected_used_within_14_days():
    ref_date = date(2026, 10, 30)
    # 2 missed days within 5 days of each other. Only 1 can be frozen per 14-day window.
    # Day 0 (today): 20 pages
    # Day 1: missed (0) -> requires freeze
    # Days 2..8: 30 pages each (210 pages, qualifies for Day 1 freeze)
    # Day 9: missed (0) -> would need freeze, but Day 1 was already frozen in window
    logs = [make_dummy_log("LOG-0", ref_date.strftime("%Y-%m-%d"), 20)]
    for d in range(2, 9):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 30))
    for d in range(10, 16):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 30))

    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Day 1 is frozen, but Day 9 cannot be frozen again within 14 days
    # Streak should walk back through Day 1 to Day 8 and stop at Day 9.
    # Count: Day 0 (1) + Days 2..8 (7) = 8 days
    assert summary.current_streak_days == 8
    assert summary.grace_freeze_used is True


def test_velocity_and_heatmap_365():
    ref_date = date(2026, 10, 30)
    # 14 days of 10 pages each = 140 / 14 = 10.0 velocity
    logs = [
        make_dummy_log(f"LOG-{i}", (ref_date - timedelta(days=i)).strftime("%Y-%m-%d"), 10)
        for i in range(14)
    ]
    # Add a massive reading day 20 days ago (60 pages -> intensity 4)
    logs.append(make_dummy_log("LOG-BIG", (ref_date - timedelta(days=20)).strftime("%Y-%m-%d"), 60))

    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    assert summary.reading_velocity_pages_per_day == 10.0
    assert len(summary.heatmap_365) == 365
    assert summary.heatmap_365[ref_date.strftime("%Y-%m-%d")] == 2  # 10 pages is [10, 20) -> 2
    assert summary.heatmap_365[(ref_date - timedelta(days=20)).strftime("%Y-%m-%d")] == 4  # >= 50 -> 4
    assert summary.heatmap_365[(ref_date - timedelta(days=50)).strftime("%Y-%m-%d")] == 0  # 0 pages -> 0


# ==================== ENDPOINT INTEGRATION TESTS ====================

def test_api_streak_summary_endpoint():
    res = client.get("/api/v1/reading/streak-summary")
    assert res.status_code == 200
    data = res.json()
    assert "current_streak_days" in data
    assert "longest_streak_days" in data
    assert "streak_at_risk" in data
    assert "today_pages" in data
    assert "daily_goal_pages" in data
    assert "reading_velocity_pages_per_day" in data
    assert "heatmap_365" in data
    assert len(data["heatmap_365"]) == 365


@pytest.mark.anyio
async def test_api_log_reading_auto_transition_unread_to_reading():
    # 1. Create a book in UNREAD status
    new_book = await sheets_repo.create_book(
        BookCreate(
            title="Auto Transition Test Novel",
            reading_status=ReadingStatus.UNREAD,
            purchase_price=250.0,
            rp=499.0,
        )
    )
    assert new_book.reading_status == ReadingStatus.UNREAD

    # 2. Log a session on this book without finished_book
    payload = {
        "book_id": new_book.book_id,
        "start_page": 1,
        "end_page": 45,
        "duration_minutes": 40,
        "session_note": "Great opening chapters",
        "finished_book": False,
    }
    res = client.post("/api/v1/reading/logs", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 201
    log_data = res.json()
    assert log_data["book_id"] == new_book.book_id
    assert log_data["pages_read"] == 44
    assert "session_date" in log_data

    # 3. Verify book status transitioned to READING
    updated_book = await sheets_repo.get_book(new_book.book_id)
    assert updated_book is not None
    assert updated_book.reading_status == ReadingStatus.READING


@pytest.mark.anyio
async def test_api_log_reading_auto_transition_to_completed_with_rating():
    # 1. Create a book in READING status
    new_book = await sheets_repo.create_book(
        BookCreate(
            title="Finish Me Novel",
            reading_status=ReadingStatus.READING,
            purchase_price=199.0,
            rp=399.0,
        )
    )

    # 2. Log final session with finished_book=True and rating=5
    payload = {
        "book_id": new_book.book_id,
        "start_page": 200,
        "end_page": 320,
        "duration_minutes": 90,
        "session_note": "Magnificent ending",
        "finished_book": True,
        "rating": 5,
    }
    res = client.post("/api/v1/reading/logs", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 201

    # 3. Verify book status transitioned to COMPLETED and rating is updated
    updated_book = await sheets_repo.get_book(new_book.book_id)
    assert updated_book is not None
    assert updated_book.reading_status == ReadingStatus.COMPLETED
    assert updated_book.rating == 5

