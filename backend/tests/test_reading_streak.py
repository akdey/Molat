from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.reading_log import ReadingLog, ReadingLogCreate
from app.models.book import BookCreate, ReadingStatus
from app.services.streak_calculator import calculate_streak_summary
from app.main import app

client = TestClient(app)
AUTH_HEADERS = {"X-Library-Key": "development-secret-key-change-in-production"}


def make_dummy_log(log_id: str, session_date: str, pages_read: int) -> ReadingLog:
    return ReadingLog(
        log_id=log_id,
        book_id="BOOK-001",
        session_date=session_date,
        start_page=1,
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
    assert summary.grace_freeze_used is False
    # Today is in-progress and must NEVER be marked as frozen!
    assert ref_date.strftime("%Y-%m-%d") not in summary.frozen_dates


def test_grace_freeze_bridging_qualified():
    ref_date = date(2026, 10, 30)
    # Today active: 20 pages
    # Yesterday missed: 0 pages
    # Prior 7 days before yesterday (days 2 to 8): 20 pages each day
    logs = [make_dummy_log("LOG-TODAY", ref_date.strftime("%Y-%m-%d"), 20)]
    for d in range(2, 9):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 20))

    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Yesterday should be bridged by grace freeze
    # Streak includes today (1) + 7 previous days = 8 days
    assert summary.current_streak_days == 8
    assert summary.grace_freeze_used is True
    assert summary.streak_at_risk is False
    assert (ref_date - timedelta(days=1)).strftime("%Y-%m-%d") in summary.frozen_dates


def test_progressive_freeze_bank_weekend_cushion():
    ref_date = date(2026, 10, 30)
    # 1. User reads 12 days (days 3..14):
    # - Starts with 1 initial welcome shield.
    # - Reads 5 days -> unlocks Shield 2.
    # - Reads 7 more days -> unlocks Shield 3 (bank is max 3/3).
    # 2. Misses 2 consecutive days (days 1 and 2).
    # 3. Today (Day 0) reads 20 pages.
    logs = [make_dummy_log("LOG-TODAY", ref_date.strftime("%Y-%m-%d"), 20)]
    for d in range(3, 15):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 20))

    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Both missed days (day 1 and day 2) cushioned by banked shields!
    assert (ref_date - timedelta(days=1)).strftime("%Y-%m-%d") in summary.frozen_dates
    assert (ref_date - timedelta(days=2)).strftime("%Y-%m-%d") in summary.frozen_dates
    # Bank dropped from 3 to 1
    assert summary.freeze_bank_count == 1
    # Streak is intact: 12 past days + 1 today = 13 days!
    assert summary.current_streak_days == 13
    assert summary.grace_freeze_used is True


def test_grace_freeze_adaptive_goal_and_frozen_dates():
    ref_date = date(2026, 10, 30)
    # Daily goal = 10 pages -> adaptive freeze threshold = max(20, 10 * 5) = 50 pages in prior 7 days
    # Day 0 (today): 10 pages
    # Day 1: missed (0) -> requires freeze
    # Days 2..6: 12 pages each (60 pages total > 50 pages required for goal 10)
    logs = [make_dummy_log("LOG-0", ref_date.strftime("%Y-%m-%d"), 10)]
    for d in range(2, 7):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 12))

    summary = calculate_streak_summary(logs, daily_goal_pages=10, reference_date=ref_date)
    assert summary.current_streak_days == 6
    assert summary.grace_freeze_used is True
    missed_day_str = (ref_date - timedelta(days=1)).strftime("%Y-%m-%d")
    assert missed_day_str in summary.frozen_dates


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
    new_book = await app.state.storage.books.create(
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
    assert log_data["pages_read"] == 45
    assert "session_date" in log_data

    # 3. Verify book status transitioned to READING
    updated_book = await app.state.storage.books.get(new_book.book_id)
    assert updated_book is not None
    assert updated_book.reading_status == ReadingStatus.READING


@pytest.mark.anyio
async def test_api_log_reading_auto_transition_to_completed_with_rating():
    # 1. Create a book in READING status
    new_book = await app.state.storage.books.create(
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
    updated_book = await app.state.storage.books.get(new_book.book_id)
    assert updated_book is not None
    assert updated_book.reading_status == ReadingStatus.COMPLETED
    assert updated_book.rating == 5


@pytest.mark.anyio
async def test_api_log_reading_inclusive_page_counting_samples():
    new_book = await app.state.storage.books.create(
        BookCreate(title="Inclusive Pages Novel", purchase_price=150.0, rp=300.0)
    )

    # Sample 1: start_page = 48, end_page = 52 -> pages_read = 5
    res1 = client.post(
        "/api/v1/reading/logs",
        json={"book_id": new_book.book_id, "start_page": 48, "end_page": 52},
        headers=AUTH_HEADERS,
    )
    assert res1.status_code == 201
    assert res1.json()["pages_read"] == 5

    # Sample 2: start_page = 100, end_page = 100 -> pages_read = 1
    res2 = client.post(
        "/api/v1/reading/logs",
        json={"book_id": new_book.book_id, "start_page": 100, "end_page": 100},
        headers=AUTH_HEADERS,
    )
    assert res2.status_code == 201
    assert res2.json()["pages_read"] == 1


def test_api_log_reading_validation_errors():
    # Sample 3: start_page = 55, end_page = 50 -> validation error (422)
    res_inverted = client.post(
        "/api/v1/reading/logs",
        json={"book_id": "BOOK-001", "start_page": 55, "end_page": 50},
        headers=AUTH_HEADERS,
    )
    assert res_inverted.status_code == 422

    # Sample 4: start_page < 1 -> validation error (422)
    res_zero_start = client.post(
        "/api/v1/reading/logs",
        json={"book_id": "BOOK-001", "start_page": 0, "end_page": 50},
        headers=AUTH_HEADERS,
    )
    assert res_zero_start.status_code == 422


