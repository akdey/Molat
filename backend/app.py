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

logger = logging.getLogger("molat.hf_spaces")
from app.features.health.router import router as health_router
from app.features.auth.router import router as auth_router
from app.features.books.router import router as books_router
from app.features.reading.router import router as reading_router
from app.features.wishlist.router import router as wishlist_router
from app.features.lending.router import router as lending_router
from app.features.settings.router import router as settings_router


def attach_api_routes(target_app):
    """Register Molat REST API v1 routes onto target FastAPI app."""
    @target_app.on_event("startup")
    async def startup_db():
        await db_manager.init_engine(settings.DATABASE_URL)

    @target_app.on_event("shutdown")
    async def shutdown_db():
        await db_manager.close()

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


with gr.Blocks(
    title="মলাট (Molat) — Backend API",
    theme=gr.themes.Base(),
    css="""
    .container { max-width: 800px; margin: auto; padding-top: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; }
    .status-active { background-color: #DEF7EC; color: #03543F; }
    """,
) as demo:
    with gr.Column(elem_classes=["container"]):
        gr.HTML(
            """
            <div class="header">
                <h1 style="font-size: 2.25rem; font-weight: 700; margin-bottom: 8px;">মলাট (Molat)</h1>
                <p style="font-size: 1.125rem; color: #4B5563;">Personal Book Library & Reading Tracker API</p>
                <div style="margin-top: 12px;">
                    <span class="status-badge status-active">● API Active on Port 7860</span>
                </div>
            </div>
            """
        )

        gr.Markdown(
            """
            ### 🚀 Headless REST API Engine
            This Hugging Face Space hosts the **FastAPI backend** for the Molat application.

            * **REST API Base URL**: `https://a-k-dey-molat.hf.space/api/v1`
            * **PWA Web App**: [molat-akdey.vercel.app](https://molat-akdey.vercel.app)
            * **Interactive OpenAPI Docs**: [/docs](/docs)
            * **System Health Check**: [/api/v1/health](/api/v1/health)

            ---
            #### Core Endpoints:
            * `GET /api/v1/books` — Library catalogue & portfolio financials
            * `POST /api/v1/books` — Catalogue a new volume
            * `GET /api/v1/reading/streak-summary` — Real-time streak, freeze shield & heatmap
            * `POST /api/v1/reading/logs` — Record a physical bookmark reading session
            * `GET /api/v1/lending` — Borrowed & active lent books
            * `GET /api/v1/wishlist` — Wishlist items
            * `GET /api/v1/settings` — User reading goals & preferences
            """
        )

app = gr.mount_gradio_app(
    app=App(),
    blocks=demo,
    path="/",
)

attach_api_routes(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
