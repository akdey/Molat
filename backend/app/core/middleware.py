# backend/app/core/middleware.py
import fnmatch
import logging
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.features.auth.security import verify_access_token

logger = logging.getLogger("molat.rbac")

ROLE_HIERARCHY: Dict[str, int] = {
    "admin": 3,
    "reader": 2,
    "guest": 1,
}

# Declarative Centralized Route Mapper (Method, Path Pattern) -> Minimum Role
ROUTE_ACCESS_MAP: Dict[str, List[Tuple[str, str]]] = {
    # Public routes (accessible by anyone without token)
    "guest": [
        ("GET", "/"),
        ("GET", "/docs*"),
        ("GET", "/openapi.json"),
        ("GET", "/api/v1/health"),
        ("POST", "/api/v1/auth/signup"),
        ("POST", "/api/v1/auth/login"),
        ("POST", "/api/v1/auth/send-verification"),
        ("POST", "/api/v1/auth/verify-email"),
        ("POST", "/api/v1/auth/verify-email-link"),
        ("GET", "/api/v1/ex/*"),       # Public reader shelf by Ex-Libris handle
    ],
    # Reader routes (any logged-in reader or admin)
    "reader": [
        ("GET", "/api/v1/auth/me"),
        ("*", "/api/v1/books*"),
        ("*", "/api/v1/reading*"),
        ("*", "/api/v1/lending*"),
        ("*", "/api/v1/wishlist*"),
        ("*", "/api/v1/settings*"),
        ("*", "/api/v1/alcoves*"),
    ],
    # Admin only routes (system maintenance, enrichers)
    "admin": [
        ("POST", "/api/v1/books/enrich-covers"),
        ("*", "/api/v1/admin/*"),
    ],
}


def get_required_role(method: str, path: str) -> str:
    """Matches request against centralized ROUTE_ACCESS_MAP to determine minimum required role."""
    # 1. Check admin first (most restrictive)
    for m, p in ROUTE_ACCESS_MAP.get("admin", []):
        if (m == "*" or m.upper() == method.upper()) and fnmatch.fnmatch(path, p):
            return "admin"

    # 2. Check explicitly public guest routes
    for m, p in ROUTE_ACCESS_MAP.get("guest", []):
        if (m == "*" or m.upper() == method.upper()) and fnmatch.fnmatch(path, p):
            return "guest"

    # 3. Check reader routes
    for m, p in ROUTE_ACCESS_MAP.get("reader", []):
        if (m == "*" or m.upper() == method.upper()) and fnmatch.fnmatch(path, p):
            return "reader"

    # Default for other API routes: require reader; for static/root: guest
    if path.startswith("/api/"):
        return "reader"
    return "guest"


class RBACMiddleware(BaseHTTPMiddleware):
    """
    Centralized Role-Based Access Control Middleware.
    Enforces permissions via ROUTE_ACCESS_MAP without touching individual route files.
    """
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        method = request.method
        required_role = get_required_role(method, path)

        auth_header = request.headers.get("Authorization")
        token_payload = None
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
            token_payload = verify_access_token(token)

        if required_role == "guest":
            if token_payload:
                request.state.user_id = token_payload.get("user_id")
                request.state.username = token_payload.get("sub")
                request.state.role = token_payload.get("role") or "reader"
            return await call_next(request)

        # Authenticate user from Bearer token
        if not token_payload:
            return JSONResponse(
                status_code=401,
                content={"detail": "Authentication required. Please log in with a valid token."},
            )

        user_role = token_payload.get("role") or "reader"
        user_tier = ROLE_HIERARCHY.get(user_role, 1)
        required_tier = ROLE_HIERARCHY.get(required_role, 1)

        if user_tier < required_tier:
            logger.warning(
                f"RBAC Access Denied: User role '{user_role}' attempted to access '{method} {path}' requiring '{required_role}'"
            )
            return JSONResponse(
                status_code=403,
                content={"detail": f"Access denied: role '{user_role}' lacks '{required_role}' privileges."},
            )

        request.state.user_id = token_payload.get("user_id")
        request.state.username = token_payload.get("sub")
        request.state.role = user_role

        return await call_next(request)
