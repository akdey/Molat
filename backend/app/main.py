# backend/app/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.database import db_manager
from app.core.rbac import RBACMiddleware
from app.features.health.router import router as health_router
from app.features.auth.router import router as auth_router
from app.features.books.router import router as books_router
from app.features.reading.router import router as reading_router
from app.features.wishlist.router import router as wishlist_router
from app.features.lending.router import router as lending_router
from app.features.settings.router import router as settings_router
from app.features.genres.router import router as genres_router
from app.features.alcoves.router import router as alcoves_router
from app.features.notifications.router import router as notifications_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("molat.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} on port {settings.PORT}")
    await db_manager.init_engine(settings.DATABASE_URL)
    yield
    logger.info("Shutting down Molat API...")
    await db_manager.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# RBAC and CORS configuration
app.add_middleware(RBACMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Authorization", "X-Auth-Token"],
)

# Register feature slice routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(books_router, prefix="/api/v1")
app.include_router(reading_router, prefix="/api/v1")
app.include_router(wishlist_router, prefix="/api/v1")
app.include_router(lending_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(genres_router, prefix="/api/v1")
app.include_router(alcoves_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "port": settings.PORT,
        "docs": "/docs" if settings.DEBUG else "disabled in production",
        "api_v1": "/api/v1",
    }
