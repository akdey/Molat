from datetime import datetime, date, timedelta
from typing import List, Dict, Set
from zoneinfo import ZoneInfo
from app.models.reading_log import ReadingLog
from app.models.responses import StreakSummaryResponse

IST = ZoneInfo("Asia/Kolkata")

# Progressive milestone ladder to earn each shield:
# - Tier 1 (0 -> 1 shield): 3 active reading days (Fast recovery safety net)
# - Tier 2 (1 -> 2 shields): 5 active reading days (Weekend protection)
# - Tier 3 (2 -> 3 shields): 7 active reading days (Vacation vault)
TIER_REQUIREMENTS: Dict[int, int] = {
    0: 3,
    1: 5,
    2: 7,
}


def get_today_ist() -> date:
    """Returns today's date in Asia/Kolkata timezone."""
    return datetime.now(IST).date()


def calculate_streak_summary(
    logs: List[ReadingLog],
    daily_goal_pages: int = 15,
    reference_date: date = None,
) -> StreakSummaryResponse:
    """
    Computes reading streak, progressive 3-shield freeze bank, risk state,
    velocity, and 365-day heatmap normalized to Asia/Kolkata (IST).
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

    # 4. Progressive 3-Shield Freeze Bank & Chronological Simulation
    all_dates = sorted(daily_pages.keys())
    running_streak = 0
    longest_streak = 0
    freeze_bank = 1  # Every reader starts with 1 initial welcome shield
    progress_days = 0
    frozen_dates: Set[date] = set()

    if all_dates:
        earliest_date = min(all_dates[0], today)
        scan_d = earliest_date
        while scan_d <= today:
            pgs = daily_pages.get(scan_d, 0)

            if scan_d < today:
                if pgs > 0:
                    running_streak += 1
                    longest_streak = max(longest_streak, running_streak)
                    # Accumulate progress towards next shield if bank < 3
                    if freeze_bank < 3:
                        progress_days += 1
                        needed = TIER_REQUIREMENTS.get(freeze_bank, 7)
                        if progress_days >= needed:
                            freeze_bank += 1
                            progress_days = 0
                else:
                    # Missed past day
                    if running_streak > 0:
                        if freeze_bank > 0:
                            # Shield absorbs the missed day!
                            freeze_bank -= 1
                            frozen_dates.add(scan_d)
                            # Streak is preserved! Progress towards next tier resets
                            progress_days = 0
                        else:
                            # Bank is empty, streak breaks
                            running_streak = 0
                            progress_days = 0
            else:
                # scan_d == today (In progress!)
                if pgs > 0:
                    running_streak += 1
                    longest_streak = max(longest_streak, running_streak)
                    if freeze_bank < 3:
                        progress_days += 1
                        needed = TIER_REQUIREMENTS.get(freeze_bank, 7)
                        if progress_days >= needed:
                            freeze_bank += 1
                            progress_days = 0
                else:
                    # Today has 0 pages so far. Today is still active and in-progress.
                    # Does NOT consume a freeze and does NOT break streak.
                    pass

            scan_d += timedelta(days=1)

    longest_streak = max(longest_streak, running_streak)
    current_streak = running_streak
    streak_at_risk = (today_pages == 0 and current_streak > 0)

    yesterday = today - timedelta(days=1)
    grace_freeze_used = (yesterday in frozen_dates)

    next_tier_required = TIER_REQUIREMENTS.get(freeze_bank, 7) if freeze_bank < 3 else 7
    sorted_frozen_dates = sorted([d.strftime("%Y-%m-%d") for d in frozen_dates])

    return StreakSummaryResponse(
        current_streak_days=current_streak,
        longest_streak_days=longest_streak,
        streak_at_risk=streak_at_risk,
        today_pages=today_pages,
        daily_goal_pages=daily_goal_pages,
        freeze_bank_count=freeze_bank,
        freeze_max_bank=3,
        freeze_progress_days=progress_days,
        freeze_next_tier_required=next_tier_required,
        frozen_dates=sorted_frozen_dates,
        grace_freeze_used=grace_freeze_used,
        grace_freeze_available=(freeze_bank > 0),
        freeze_cooldown_days_left=0,
        freeze_prior_pages=progress_days,
        freeze_required_pages=next_tier_required,
        reading_velocity_pages_per_day=reading_velocity,
        heatmap_365=heatmap_365,
    )
