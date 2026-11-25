# backend/app/features/health/router.py
from datetime import datetime
from fastapi import APIRouter
from app.config import settings
from app.core.database import db_manager
from app.core.responses import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
async def get_health():
    """Returns container status, port (7860), and database engine connectivity."""
    is_connected = db_manager.is_connected

    return HealthResponse(
        status="ok",
        port=settings.PORT,
        sheets_connected=is_connected,
        bridge_url_configured=False,
        db_connected=is_connected,
        cache_ttl_seconds=settings.CACHE_TTL_SECONDS,
        cache_cached_entries=0,
        timestamp=datetime.utcnow().isoformat(),
    )
