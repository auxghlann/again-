import sys
from fastapi import APIRouter
import sqlalchemy as sa

from backend.db.database import engine
from backend.runner.postgres import check_postgres_connection
from backend.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns local service health for API, database, and execution runner sandboxes."""
    # Check app database connection
    db_status = "error"
    try:
        with engine.connect() as conn:
            conn.execute(sa.text("SELECT 1;"))
            db_status = "connected"
    except Exception as e:
        db_status = f"unreachable ({e})"

    # Check PostgreSQL sandbox runner connection
    pg_connected = check_postgres_connection()
    postgres_status = "connected" if pg_connected else "disconnected"

    # Check Python sandbox runner capability
    python_status = "ready" if sys.executable else "unavailable"

    # Overall runner health
    runner_status = "connected" if pg_connected else "disconnected"
    overall_status = "healthy" if (db_status == "connected" and pg_connected) else "degraded"

    return HealthResponse(
        status=overall_status,
        api="online",
        db=db_status,
        runner=runner_status,
        runner_python=python_status,
        version="1.0.0",
    )
