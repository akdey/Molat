from typing import Generic, TypeVar, Optional, Any, Dict
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    data: T
    meta: Optional[Dict[str, Any]] = None


class HealthStatus(BaseModel):
    status: str  # "ok", "stale", "unconfigured", "error"
    sheets_connected: bool
    spreadsheet_id_configured: bool
    service_account_configured: bool
    last_successful_read: Optional[str] = None
    last_successful_write: Optional[str] = None
    message: Optional[str] = None

