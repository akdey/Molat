# backend/app/features/health/models.py
from typing import Optional
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    port: int
    sheets_connected: bool
    bridge_url_configured: bool
    db_connected: Optional[bool] = False
    cache_ttl_seconds: int
    cache_cached_entries: int
    timestamp: str
