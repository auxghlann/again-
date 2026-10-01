from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Schema for server health diagnostic check."""
    status: str
    db: str
    postgres: str
    version: str = "1.0.0"
