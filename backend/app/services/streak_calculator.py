from datetime import datetime, date, timedelta
from typing import List, Dict, Tuple, Set
from zoneinfo import ZoneInfo
from app.models.reading_log import ReadingLog
from app.models.responses import StreakSummaryResponse

IST = ZoneInfo("Asia/Kolkata")


def get_today_ist() -> date:
    """Returns today's date in Asia/Kolkata timezone."""
    return datetime.now(IST).date()


def calculate_streak_summary(
    logs: List[ReadingLog],
    daily_goal_pages: int = 20,
    reference_date: date = None,
) -> StreakSummaryResponse:
    """
    Computes reading streak, risk state, grace freeze, velocity, and 365-day heatmap
    normalized to Asia/Kolkata (IST).
    """
    if reference_date is None:
        today = get_today_ist()
    else:
        today = reference_date

    # 1. Aggregate pages per day (YYYY-MM-DD -> total_pages)
    daily_pages: Dict[date, int] = {}
    for log in logs:
        if not log.session_date:
            continue
        try:
            d = datetime.strptime(log.session_date[:10], "%Y-%m-%d").date()
            daily_pages[d] = daily_pages.get(d, 0) + max(0, log.pages_read)
        except ValueError:
            continue

    today_pages = daily_pages.get(today, 0)

    # 2. 14-day rolling velocity
    past_14_sum = sum(daily_pages.get(today - timedelta(days=i), 0) for i in range(14))
    reading_velocity = round(past_14_sum / 14.0, 1)

    # 3. 365-day Heatmap (today - 364 to today)
    heatmap_365: Dict[str, int] = {}
    for i in range(364, -1, -1):
        target_d = today - timedelta(days=i)
        pgs = daily_pages.get(target_d, 0)
        if pgs == 0:
            intensity = 0
        elif pgs < 10:
            intensity = 1
        elif pgs < 20:
            intensity = 2
        elif pgs < 50:
            intensity = 3
        else:
            intensity = 4
        heatmap_365[target_d.strftime("%Y-%m-%d")] = intensity

    # 4. Helper: Check if a missed day qualifies for grace freeze
    def can_grace_freeze(missed_date: date, used_freeze_dates: Set[date]) -> bool:
        # Check if another freeze was used within 14 days
        for fd in used_freeze_dates:
            if abs((missed_date - fd).days) < 14:
                return False
        # Check if prior 7 days have sum >= 100 pages
        prior_7_sum = sum(
            daily_pages.get(missed_date - timedelta(days=d), 0) for d in range(1, 8)
        )
        return prior_7_sum >= 100

    # 5. Current Streak & Risk Calculation
    current_streak = 0
    streak_at_risk = False
    grace_freeze_used_in_current = False
    used_freezes: Set[date] = set()

    # Determine start point of backward walk
    start_date = None
    if today_pages > 0:
        start_date = today
        streak_at_risk = False
    else:
        yesterday = today - timedelta(days=1)
        yesterday_pages = daily_pages.get(yesterday, 0)
        if yesterday_pages > 0:
            start_date = yesterday
            streak_at_risk = True
        else:
            # Check if yesterday can be grace-frozen to preserve streak ending on yesterday - 1
            if can_grace_freeze(yesterday, used_freezes):
                day_before = yesterday - timedelta(days=1)
                if daily_pages.get(day_before, 0) > 0:
                    used_freezes.add(yesterday)
                    grace_freeze_used_in_current = True
                    start_date = day_before
                    streak_at_risk = True

    if start_date is not None:
        curr = start_date
        while True:
            pages = daily_pages.get(curr, 0)
            if pages > 0:
                current_streak += 1
                curr = curr - timedelta(days=1)
            else:
                # 0 pages on curr; check if it qualifies for grace freeze
                if can_grace_freeze(curr, used_freezes):
                    used_freezes.add(curr)
                    grace_freeze_used_in_current = True
                    curr = curr - timedelta(days=1)
                else:
                    break

    # 6. Longest Streak Calculation (Global historical scan)
    all_dates = sorted(daily_pages.keys())
    longest_streak = 0
    if all_dates:
        earliest_date = all_dates[0]
        scan_end = today
        historical_freezes: Set[date] = set()
        running_streak = 0

        scan_d = earliest_date
        while scan_d <= scan_end:
            pgs = daily_pages.get(scan_d, 0)
            if pgs > 0:
                running_streak += 1
                longest_streak = max(longest_streak, running_streak)
                scan_d += timedelta(days=1)
            else:
                # Missed day: check grace freeze
                if running_streak > 0 and can_grace_freeze(scan_d, historical_freezes):
                    historical_freezes.add(scan_d)
                    scan_d += timedelta(days=1)
                else:
                    running_streak = 0
                    scan_d += timedelta(days=1)

    longest_streak = max(longest_streak, current_streak)

    return StreakSummaryResponse(
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        streak_at_risk=streak_at_risk,
        today_pages=today_pages,
        daily_goal_pages=daily_goal_pages,
        grace_freeze_used=grace_freeze_used_in_current,
        reading_velocity_pages_per_day=reading_velocity,
        heatmap_365=heatmap_365,
    )
