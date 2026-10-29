from fastapi import APIRouter
from app.models.responses import HealthStatus
from app.services.sheets_service import sheets_service

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthStatus)
async def health_check():
    """
    Non-sensitive connection status.
    Returns connectivity state and timestamps without exposing secrets,
    service account keys, or spreadsheet URLs.
    """
    info = sheets_service.get_health()
    return HealthStatus(**info)


@router.post("/verify-headers")
async def verify_headers():
    """Verifies and initializes sheet headers if needed."""
    valid = await sheets_service.verify_headers()
    return {"headers_valid": valid}

