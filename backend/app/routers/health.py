# backend/app/routers/health.py
from datetime import datetime
from fastapi import APIRouter, Request
from app.config import settings
from app.models.responses import HealthResponse
from app.storage.postgres import PostgresStorageFactory
from app.storage.sheets import SheetsStorageFactory

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
async def get_health(request: Request):
    """Returns container status, port (7860), and storage engine connectivity."""
    storage = getattr(request.app.state, "storage", None)
    is_pg = isinstance(storage, PostgresStorageFactory) if storage else False
    is_sheets = isinstance(storage, SheetsStorageFactory) if storage else False

    return HealthResponse(
        status="ok",
        port=settings.PORT,
        sheets_connected=is_sheets or is_pg,
        bridge_url_configured=bool(settings.GOOGLE_SHEETS_BRIDGE_URL),
        db_connected=is_pg,
        cache_ttl_seconds=settings.CACHE_TTL_SECONDS,
        cache_cached_entries=0,
        timestamp=datetime.utcnow().isoformat(),
    )
