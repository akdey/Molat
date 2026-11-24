# backend/app/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.database import db_manager
from app.storage import PostgresStorageFactory, SheetsStorageFactory, MemoryStorageFactory
from app.routers import health, auth
from app.features.books.router import router as books_router
from app.features.reading.router import router as reading_router
from app.features.lending.router import router as lending_router
from app.features.wishlist.router import router as wishlist_router
from app.features.settings.router import router as settings_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("molat.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} on port {settings.PORT}")

    # Initialize concrete Storage Factory once at startup
    if settings.DATABASE_URL and "[YOUR-DATABASE-PASSWORD]" not in settings.DATABASE_URL:
        pool = await db_manager.init_pool(settings.DATABASE_URL)
        if pool:
            app.state.storage = PostgresStorageFactory(pool)
            logger.info("Active storage engine: PostgreSQL (Supabase)")
        else:
            app.state.storage = MemoryStorageFactory()
            logger.info("Active storage engine: In-Memory fallback")
    elif settings.GOOGLE_SHEETS_BRIDGE_URL:
        app.state.storage = SheetsStorageFactory(settings.GOOGLE_SHEETS_BRIDGE_URL, settings.BRIDGE_TOKEN)
        logger.info("Active storage engine: Google Sheets Bridge")
    else:
        app.state.storage = MemoryStorageFactory()
        logger.info("Active storage engine: In-Memory")

    yield

    logger.info("Shutting down Molat API...")
    if hasattr(app.state, "storage") and app.state.storage:
        await app.state.storage.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=settings.DEBUG)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# Mount feature and core routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(books_router, prefix="/api/v1")
app.include_router(reading_router, prefix="/api/v1")
app.include_router(wishlist_router, prefix="/api/v1")
app.include_router(lending_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs" if settings.DEBUG else "disabled in production",
        "port": settings.PORT,
    }
