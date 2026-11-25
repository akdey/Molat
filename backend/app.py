# backend/app.py
import os
import logging
import gradio as gr

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

from app.config import settings
from app.main import app as main_app

logger = logging.getLogger("molat.hf_spaces")

with gr.Blocks(
    title="মলাট (Molat) — Backend API",
) as demo:
    with gr.Column(elem_classes=["container"]):
        gr.HTML(
            """
            <div class="header" style="text-align: center; margin-bottom: 24px; padding-top: 30px;">
                <h1 style="font-size: 2.25rem; font-weight: 700; margin-bottom: 8px;">মলাট (Molat)</h1>
                <p style="font-size: 1.125rem; color: #4B5563;">Personal Book Library & Reading Tracker API</p>
                <div style="margin-top: 12px;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; background-color: #DEF7EC; color: #03543F;">
                        ● API Active on Port 7860
                    </span>
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

# Mount Gradio splash UI directly onto the configured main FastAPI application
app = gr.mount_gradio_app(
    app=main_app,
    blocks=demo,
    path="/",
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
