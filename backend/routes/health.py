from fastapi import APIRouter
import sqlalchemy as sa

from backend.db.database import engine
from backend.runner.postgres import check_postgres_connection
from backend.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns local service health for the app database and PostgreSQL sandbox."""
    # Check app database connection
    db_status = "error"
    try:
        with engine.connect() as conn:
            conn.execute(sa.text("SELECT 1;"))
            db_status = "connected"
    except Exception as e:
        db_status = f"unreachable ({e})"

    # Check PostgreSQL sandbox connection
    pg_connected = check_postgres_connection()
    postgres_status = "connected" if pg_connected else "disconnected"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "degraded",
        db=db_status,
        postgres=postgres_status,
        version="1.0.0",
    )
