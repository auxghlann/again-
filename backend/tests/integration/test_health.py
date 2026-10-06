def test_root_endpoint(client):
    """Verifies that the root endpoint returns service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "again!"
    assert data["status"] == "online"
    assert data["docs"] == "/docs"


def test_healthz_endpoint(client):
    """Verifies that /api/healthz returns connectivity status for databases."""
    response = client.get("/api/healthz")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["db"] == "connected"
    assert data["runner"] == "connected"
    assert data["version"] == "1.0.0"
