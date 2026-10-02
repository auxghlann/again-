from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_root_endpoint():
    """Verifies that the root endpoint returns service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "again!"
    assert data["status"] == "online"
    assert data["docs"] == "/docs"


def test_healthz_endpoint():
    """Verifies that /api/healthz returns connectivity status for databases."""
    response = client.get("/api/healthz")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["db"] == "connected"
    assert "postgres" in data
    assert data["version"] == "1.0.0"
