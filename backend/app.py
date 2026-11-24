# backend/app.py
import os

# Disable Gradio 5 Node.js SSR proxy so FastAPI directly handles all POST/GET requests
os.environ["GRADIO_SSR_MODE"] = "False"

# Graceful import of Hugging Face ZeroGPU SDK (MUST BE FIRST)
try:
    import spaces
except ImportError:
    class _MockSpaces:
        @classmethod
        def GPU(cls, fn=None, duration=120):
            if callable(fn):
                return fn
            def decorator(f):
                return f
            return decorator
    spaces = _MockSpaces()

import gradio as gr
from fastapi.middleware.cors import CORSMiddleware
import logging
from gradio.routes import App
from app.config import settings
from app.core.database import db_manager
from app.core.rbac import RBACMiddleware
from app.storage import PostgresStorageFactory, SheetsStorageFactory, MemoryStorageFactory

logger = logging.getLogger("molat.hf_spaces")
from app.storage.provider import init_storage
from app.features.health.router import router as health_router
from app.features.auth.router import router as auth_router
from app.features.books.router import router as books_router
from app.features.reading.router import router as reading_router
from app.features.wishlist.router import router as wishlist_router
from app.features.lending.router import router as lending_router
from app.features.settings.router import router as settings_router


def attach_api_routes(target_app):
    """Register Molat REST API v1 routes and storage engine onto target FastAPI app."""
    @target_app.on_event("startup")
    async def startup_storage():
        await init_storage(target_app.state)

    @target_app.on_event("shutdown")
    async def shutdown_storage():
        if hasattr(target_app.state, "storage") and target_app.state.storage:
            await target_app.state.storage.close()

    target_app.add_middleware(RBACMiddleware)
    target_app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["Authorization", "X-Auth-Token"],
    )
    target_app.include_router(health_router, prefix="/api/v1")
    target_app.include_router(auth_router, prefix="/api/v1")
    target_app.include_router(books_router, prefix="/api/v1")
    target_app.include_router(reading_router, prefix="/api/v1")
    target_app.include_router(wishlist_router, prefix="/api/v1")
    target_app.include_router(lending_router, prefix="/api/v1")
    target_app.include_router(settings_router, prefix="/api/v1")


# Patch Gradio App.create_app so that whatever App Gradio instantiates in launch(),
# all Molat REST API v1 routes are unconditionally attached.
_orig_create_app = App.create_app


def _patched_create_app(*args, **kwargs):
    created_app = _orig_create_app(*args, **kwargs)
    attach_api_routes(created_app)
    return created_app


App.create_app = _patched_create_app


# Minimal Gradio landing UI for Hugging Face Spaces visitors
with gr.Blocks(title="Molat Personal Book Library API") as demo:
    gr.Markdown(
        """
        # Molat (মলাট) — Personal Library API
        Welcome to the Molat backend server.
        - **API Health**: [/api/v1/health](/api/v1/health)
        - **Books API**: [/api/v1/books](/api/v1/books)
        - **Streak API**: [/api/v1/reading/streak-summary](/api/v1/reading/streak-summary)
        - **Frontend App**: [molat-akdey.vercel.app](https://molat-akdey.vercel.app)
        """
    )

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=settings.PORT,
        show_error=True,
    )
