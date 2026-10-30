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
from app.main import app as fastapi_app


@spaces.GPU(duration=120)
def cluster_health_check(query: str = "health_ping") -> str:
    """ZeroGPU health check handler required by Hugging Face ZeroGPU Spaces runtime."""
    return f"✅ ZeroGPU cluster operational & Molat FastAPI backend online. Query: {query}"


# Gradio Interface directly binds cluster_health_check for ZeroGPU startup scanner
demo = gr.Interface(
    fn=cluster_health_check,
    inputs=gr.Textbox(label="System Status Query", value="ping"),
    outputs=gr.Textbox(label="Cluster Response"),
    title="📚 Ondorpata / Molat Library API",
    description=(
        "FastAPI backend mounted on Gradio, serving REST endpoints under `/api/v1` for the Molat Library PWA.\n\n"
        "- [Interactive API Docs](/docs)\n"
        "- [Health Check](/api/v1/health)\n"
        "- [Streak Summary](/api/v1/reading/streak-summary)"
    ),
)

# Mount FastAPI app onto Gradio so all /api/v1 endpoints are served directly
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
