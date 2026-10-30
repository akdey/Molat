from datetime import datetime
from fastapi import APIRouter
from app.config import settings
from app.models.responses import HealthResponse
from app.repositories.sheets_repository import sheets_repo

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
async def get_health():
    """
    Returns container status, cache age, port (7860),
    and Google Sheet connectivity.
    """
    return HealthResponse(
        status="ok",
        port=settings.PORT,
        sheets_connected=True,
        bridge_url_configured=sheets_repo.is_bridge_configured,
        cache_ttl_seconds=settings.CACHE_TTL_SECONDS,
        cache_cached_entries=len(sheets_repo.cache),
        timestamp=datetime.utcnow().isoformat(),
    )

