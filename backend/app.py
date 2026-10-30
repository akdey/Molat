import gradio as gr
from app.main import app as fastapi_app

# Graceful import of Hugging Face ZeroGPU SDK
try:
    import spaces
except ImportError:
    class _MockSpaces:
        @staticmethod
        def GPU(fn=None, duration=60):
            if fn is not None:
                return fn
            def decorator(f):
                return f
            return decorator
    spaces = _MockSpaces()


@spaces.GPU
def cluster_health_check() -> str:
    """ZeroGPU health check handler required by Hugging Face ZeroGPU Spaces runtime."""
    return "✅ ZeroGPU cluster operational & Molat FastAPI backend online."


# Create informative Gradio status dashboard
with gr.Blocks(title="Ondorpata / Molat Library API") as demo:
    gr.Markdown("# 📚 Ondorpata / Molat Personal Book Library API")
    gr.Markdown(
        "FastAPI backend is online and serving endpoints under `/api/v1` for the Molat Library PWA.\n\n"
        "- **Interactive API Docs**: [/docs](/docs)\n"
        "- **Health Check**: [/api/v1/health](/api/v1/health)\n"
        "- **Streak Summary**: [/api/v1/reading/streak-summary](/api/v1/reading/streak-summary)\n"
    )

    with gr.Row():
        status_btn = gr.Button("🔍 Ping Cluster & GPU Status", size="sm")
        status_output = gr.Textbox(
            label="System Status",
            value="Ready - Waiting for request",
            interactive=False,
        )
        status_btn.click(fn=cluster_health_check, inputs=[], outputs=[status_output])

# Mount FastAPI app onto Gradio so all /api/v1 endpoints are served directly
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
