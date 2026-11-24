# backend/app/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.database import db_manager
from app.core.rbac import RBACMiddleware
from app.storage import PostgresStorageFactory, SheetsStorageFactory, MemoryStorageFactory
from app.features.health.router import router as health_router
from app.features.auth.router import router as auth_router
from app.features.books.router import router as books_router
from app.features.reading.router import router as reading_router
from app.features.wishlist.router import router as wishlist_router
from app.features.lending.router import router as lending_router
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
            print("\n" + "=" * 50)
            print(">>> [STORAGE DESTINATION]: DB")
            print("=" * 50 + "\n", flush=True)
            logger.info("Storage destination: DB")
        elif settings.GOOGLE_SHEETS_BRIDGE_URL:
            app.state.storage = SheetsStorageFactory(settings.GOOGLE_SHEETS_BRIDGE_URL, settings.BRIDGE_TOKEN)
            print("\n" + "=" * 50)
            print(">>> [STORAGE DESTINATION]: SHEET (DB failed, fell back to Sheet)")
            print("=" * 50 + "\n", flush=True)
            logger.info("Storage destination: SHEET (fallback from DB)")
        else:
            app.state.storage = MemoryStorageFactory()
            print("\n" + "=" * 50)
            print(">>> [STORAGE DESTINATION]: LOCALDB (DB connection failed)")
            print("=" * 50 + "\n", flush=True)
            logger.info("Storage destination: LOCALDB")
    elif settings.GOOGLE_SHEETS_BRIDGE_URL:
        app.state.storage = SheetsStorageFactory(settings.GOOGLE_SHEETS_BRIDGE_URL, settings.BRIDGE_TOKEN)
        print("\n" + "=" * 50)
        print(">>> [STORAGE DESTINATION]: SHEET")
        print("=" * 50 + "\n", flush=True)
        logger.info("Storage destination: SHEET")
    else:
        app.state.storage = MemoryStorageFactory()
        print("\n" + "=" * 50)
        print(">>> [STORAGE DESTINATION]: LOCALDB")
        print("=" * 50 + "\n", flush=True)
        logger.info("Storage destination: LOCALDB")

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

# RBAC and CORS configuration
app.add_middleware(RBACMiddleware)
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


# Mount feature routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
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
