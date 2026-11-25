# backend/app/core/rbac.py
# Re-export from canonical middleware module
from app.core.middleware import (
    ROLE_HIERARCHY,
    ROUTE_ACCESS_MAP,
    get_required_role,
    RBACMiddleware,
)

__all__ = [
    "ROLE_HIERARCHY",
    "ROUTE_ACCESS_MAP",
    "get_required_role",
    "RBACMiddleware",
]
