from typing import List, Optional, Dict, Any
from pydantic import BaseModel
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
    daily_goal_pages: int = 20
    grace_freeze_used: bool
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
