FROM python:3.11-slim

# Prevent Python from writing .pyc and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

WORKDIR /app

# Install curl for container health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Create non-root user with UID 1000 for Hugging Face Spaces Docker runtime
RUN useradd -m -u 1000 user
ENV HOME=/home/user

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies into /app/.venv without dev dependencies
RUN uv sync --frozen --no-dev

# Set PATH to prioritize the uv virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Copy application source and chown to user
COPY --chown=user:user . /app

USER user

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
