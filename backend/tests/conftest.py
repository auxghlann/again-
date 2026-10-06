import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app import app
from backend.db.database import get_db_session, get_engine, init_db


@pytest.fixture(scope="session", autouse=True)
def check_postgres_available():
    """Fails fast with clear diagnosis if PostgreSQL in Docker is unreachable."""
    engine = get_engine()
    try:
        with engine.connect() as conn:
            pass
    except Exception as exc:
        pytest.fail(
            f"Could not connect to PostgreSQL on localhost:5432. "
            f"Ensure Docker and the 'again-postgres' container are running.\nError: {exc}"
        )
    init_db(engine)


@pytest.fixture
def db_session():
    """Provides an isolated transactional database session that rolls back on test teardown.
    Uses join_transaction_mode='create_savepoint' so internal application route commits
    only release savepoints, leaving the outer transaction intact to be fully rolled back.
    """
    engine = get_engine()
    connection = engine.connect()
    trans = connection.begin()

    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        autoflush=False,
        autocommit=False,
    )

    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session):
    """Provides a TestClient whose database dependency yields the isolated rollback session.
    All database writes created via HTTP endpoints are automatically rolled back.
    """
    def override_get_db_session():
        yield db_session

    app.dependency_overrides[get_db_session] = override_get_db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
