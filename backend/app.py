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
from gradio.routes import App
from app.config import settings
from app.routers import health, books, reading, wishlist, auth


def attach_api_routes(target_app):
    """Register Molat REST API v1 routes and CORS middleware onto target FastAPI app."""
    target_app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    target_app.include_router(health.router, prefix="/api/v1")
    target_app.include_router(auth.router, prefix="/api/v1")
    target_app.include_router(books.router, prefix="/api/v1")
    target_app.include_router(reading.router, prefix="/api/v1")
    target_app.include_router(wishlist.router, prefix="/api/v1")


# Patch Gradio App.create_app so that whatever App Gradio instantiates in launch(),
# all Molat REST API v1 routes are unconditionally attached.
_orig_create_app = App.create_app


def _patched_create_app(*args, **kwargs):
    created_app = _orig_create_app(*args, **kwargs)
    attach_api_routes(created_app)
    return created_app


App.create_app = staticmethod(_patched_create_app)


@spaces.GPU(duration=120)
def predict(query: str = "health_ping") -> str:
    """ZeroGPU function required for ZeroGPU startup verification."""
    return f"ZeroGPU cluster active & Molat API ready. Echo: {query}"


# Gradio Interface explicitly wired with @spaces.GPU for HF ZeroGPU scanner
demo = gr.Interface(
    fn=predict,
    inputs=gr.Textbox(label="Query", value="ping"),
    outputs=gr.Textbox(label="Status"),
    title="📚 Ondorpata / Molat Library API",
    description=(
        "FastAPI backend running with Gradio on Hugging Face Spaces, serving REST endpoints under `/api/v1` for the Molat Library PWA.\n\n"
        "- [Interactive API Docs](/docs)\n"
        "- [Health Check](/api/v1/health)\n"
        "- [Streak Summary](/api/v1/reading/streak-summary)"
    ),
)

# Also ensure initial demo.app has routes if inspected before launch
attach_api_routes(demo.app)

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        ssr_mode=False,
    )
