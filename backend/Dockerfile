FROM python:3.11-slim

# Install uv from official binary image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY backend/pyproject.toml backend/
RUN cd backend && uv sync --no-dev

# Copy application source code
COPY backend/ backend/

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uv", "run", "--project", "backend", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
