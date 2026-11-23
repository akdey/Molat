from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.book import Book


class PortfolioSummary(BaseModel):
    total_cp: float = 0.0          # Total Cost Price (purchase_price)
    total_rp: float = 0.0          # Total Retail Price (rp)
    total_saved: float = 0.0       # total_rp - total_cp
    discount_pct: float = 0.0      # (total_saved / total_rp) * 100
    total_books: int = 0


class BookListResponse(BaseModel):
    books: List[Book]
    portfolio: PortfolioSummary


class EnrichCoversResponse(BaseModel):
    scanned: int
    enriched: int
    updated_books: List[Dict[str, str]]
    message: str


class StreakSummaryResponse(BaseModel):
    current_streak_days: int
    longest_streak_days: int
    streak_at_risk: bool
    today_pages: int
    daily_goal_pages: int = 15
    freeze_bank_count: int = 1
    freeze_max_bank: int = 3
    freeze_progress_days: int = 0
    freeze_next_tier_required: int = 5
    frozen_dates: List[str] = Field(default_factory=list)
    grace_freeze_used: bool = False
    grace_freeze_available: bool = False
    freeze_cooldown_days_left: int = 0
    freeze_prior_pages: int = 0
    freeze_required_pages: int = 0
    reading_velocity_pages_per_day: float
    heatmap_365: Dict[str, int]


class HealthResponse(BaseModel):
    status: str
    port: int
    sheets_connected: bool
    bridge_url_configured: bool
    cache_ttl_seconds: int
    cache_cached_entries: int
    timestamp: str
