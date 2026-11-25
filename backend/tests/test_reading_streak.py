from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.features.reading.models import ReadingLog, ReadingLogCreate
from app.features.books.models import BookCreate, ReadingStatus
from app.features.reading.streak_calculator import calculate_streak_summary
from app.core.security import create_access_token

client = TestClient(app)
AUTH_HEADERS = {"Authorization": f"Bearer {create_access_token('reader_test', user_id='usr_test')}"}



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
    # 5 consecutive days of 25 pages each (< 7 days habit foundation)
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
    # Under 7 days: 0 shields earned yet, 5/7 days progress
    assert summary.freeze_bank_count == 0
    assert summary.freeze_progress_days == 5
    assert summary.freeze_next_tier_required == 7
    assert summary.freeze_recovery_active is False


def test_no_freeze_earned_at_3_days_break_on_miss():
    ref_date = date(2026, 10, 30)
    # User reads 3 days (days 2, 3, 4), misses day 1, today active
    logs = [
        make_dummy_log("LOG-TODAY", ref_date.strftime("%Y-%m-%d"), 20),
        make_dummy_log("LOG-2", (ref_date - timedelta(days=2)).strftime("%Y-%m-%d"), 20),
        make_dummy_log("LOG-3", (ref_date - timedelta(days=3)).strftime("%Y-%m-%d"), 20),
        make_dummy_log("LOG-4", (ref_date - timedelta(days=4)).strftime("%Y-%m-%d"), 20),
    ]
    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Reading 3 days did NOT earn a freeze (requires 7 days foundation)
    # Missed day 1 broke the streak! Current streak is just today (1 day)
    assert summary.current_streak_days == 1
    assert summary.longest_streak_days == 3
    assert summary.freeze_bank_count == 0
    assert summary.grace_freeze_used is False


def test_habit_foundation_unlock_at_7_days():
    ref_date = date(2026, 10, 30)
    # 7 consecutive days of reading
    logs = [
        make_dummy_log(f"LOG-{i}", (ref_date - timedelta(days=i)).strftime("%Y-%m-%d"), 20)
        for i in range(7)
    ]
    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    assert summary.current_streak_days == 7
    # Reaching 7 days unlocks Shield 1!
    assert summary.freeze_bank_count == 1
    assert summary.freeze_progress_days == 0
    # Next shield (Shield 2) requires 5 more days
    assert summary.freeze_next_tier_required == 5
    assert summary.freeze_recovery_active is False


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
    # User earned Shield 1 during days 2..8, which cushions yesterday!
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
    # Bank dropped to 0, now in Fast Recovery mode!
    assert summary.freeze_bank_count == 0
    assert summary.freeze_recovery_active is True
    assert summary.freeze_next_tier_required == 3


def test_fast_recovery_restores_shield_in_3_days():
    ref_date = date(2026, 10, 30)
    # User reads 7 days (days 5..11) -> unlocks Shield 1
    # Day 4: missed -> burns Shield 1 (bank = 0, in_recovery = True)
    # Days 1, 2, 3: reads 3 consecutive days! (Fast Recovery completed)
    # Day 0 (today): active
    logs = [make_dummy_log("LOG-TODAY", ref_date.strftime("%Y-%m-%d"), 20)]
    for d in range(1, 4):
        logs.append(make_dummy_log(f"LOG-REC-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 20))
    for d in range(5, 12):
        logs.append(make_dummy_log(f"LOG-INIT-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 20))

    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Streak is intact: 7 past + 3 recovery + 1 today = 11 days
    assert summary.current_streak_days == 11
    # Shield was restored after 3 days of fast recovery!
    assert summary.freeze_bank_count >= 1
    assert summary.freeze_recovery_active is False


def test_progressive_freeze_bank_weekend_cushion():
    ref_date = date(2026, 10, 30)
    # User reads 19 days (days 3..21):
    # - 7 days (days 15..21) -> unlocks Shield 1
    # - 5 days (days 10..14) -> unlocks Shield 2
    # - 7 days (days 3..9) -> unlocks Shield 3 (bank = 3/3)
    # Misses 2 consecutive days (days 1 and 2).
    # Today (Day 0) reads 20 pages.
    logs = [make_dummy_log("LOG-TODAY", ref_date.strftime("%Y-%m-%d"), 20)]
    for d in range(3, 22):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 20))

    summary = calculate_streak_summary(logs, daily_goal_pages=20, reference_date=ref_date)
    # Both missed days (day 1 and day 2) cushioned by banked shields!
    assert (ref_date - timedelta(days=1)).strftime("%Y-%m-%d") in summary.frozen_dates
    assert (ref_date - timedelta(days=2)).strftime("%Y-%m-%d") in summary.frozen_dates
    # Bank dropped from 3 to 1
    assert summary.freeze_bank_count == 1
    # Streak is intact: 19 past days + 1 today = 20 days!
    assert summary.current_streak_days == 20
    assert summary.grace_freeze_used is True


def test_grace_freeze_adaptive_goal_and_frozen_dates():
    ref_date = date(2026, 10, 30)
    # Daily goal = 10 pages -> adaptive freeze threshold = max(20, 10 * 5) = 50 pages in prior 7 days
    # Day 0 (today): 10 pages
    # Day 1: missed (0) -> requires freeze
    # Days 2..8: 7 consecutive days of 12 pages (earns Shield 1!)
    logs = [make_dummy_log("LOG-0", ref_date.strftime("%Y-%m-%d"), 10)]
    for d in range(2, 9):
        logs.append(make_dummy_log(f"LOG-{d}", (ref_date - timedelta(days=d)).strftime("%Y-%m-%d"), 12))

    summary = calculate_streak_summary(logs, daily_goal_pages=10, reference_date=ref_date)
    assert summary.current_streak_days == 8
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
    res = client.get("/api/v1/reading/streak-summary", headers=AUTH_HEADERS)
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
        ),
        user_id="usr_test",
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
    updated_book = await app.state.storage.books.get(new_book.book_id, user_id="usr_test")
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
        ),
        user_id="usr_test",
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
    updated_book = await app.state.storage.books.get(new_book.book_id, user_id="usr_test")
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


