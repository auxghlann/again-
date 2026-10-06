from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Schema for server health diagnostic check."""
    status: str
    db: str
    api: str = "online"
    runner: str = "connected"
    runner_python: str = "ready"
    version: str = "1.0.0"
