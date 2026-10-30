import gradio as gr
from app.main import app as fastapi_app

# Create an informative Gradio status dashboard
with gr.Blocks(title="Ondorpata / Molat Library API") as demo:
    gr.Markdown("# 📚 Ondorpata / Molat Personal Book Library API")
    gr.Markdown(
        "FastAPI backend is online and serving endpoints under `/api/v1` for the Molat Library PWA.\n\n"
        "- **Interactive API Docs**: [/docs](/docs)\n"
        "- **Health Check**: [/api/v1/health](/api/v1/health)\n"
        "- **Streak Summary**: [/api/v1/reading/streak-summary](/api/v1/reading/streak-summary)\n"
    )

# Mount FastAPI app onto Gradio so all /api/v1 endpoints are served directly
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
