from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_get_study_plans_catalog():
    """Verifies that /api/plans returns all seeded study tracks."""
    response = client.get("/api/plans")
    assert response.status_code == 200
    plans = response.json()
    assert len(plans) == 3

    first = plans[0]
    assert "id" in first
    assert "title" in first
    assert "language" in first
    assert "total_problems" in first
    assert "solved_count" in first


def test_get_study_plan_detail():
    """Verifies that /api/plans/{id} returns the plan and its problem checklist."""
    plan_id = "sql-beginner"
    response = client.get(f"/api/plans/{plan_id}")
    assert response.status_code == 200
    plan = response.json()

    assert plan["id"] == plan_id
    assert plan["language"] == "SQL"
    assert len(plan["problems"]) == 5

    prob1 = plan["problems"][0]
    assert "id" in prob1
    assert "title" in prob1
    assert "difficulty" in prob1
    assert "solved" in prob1


def test_get_coding_problem_detail():
    """Verifies that /api/problems/{id} returns description, starter code, and test cases."""
    prob_id = "sql-beginner:low-stock-inventory-alert"
    response = client.get(f"/api/problems/{prob_id}")
    assert response.status_code == 200
    prob = response.json()

    assert prob["id"] == prob_id
    assert prob["title"] == "Low Stock Inventory Alert"
    assert prob["difficulty"] == "Easy"
    assert "starter_code" in prob
    assert "-- Write your PostgreSQL query statement below" in prob["starter_code"]
    assert "SELECT" not in prob["starter_code"]
    assert len(prob["cases"]) >= 1

    c1 = prob["cases"][0]
    assert c1["case_index"] == 1
    assert "input" in c1
    assert "expected_output" in c1
    assert len(c1["expected_output"]["rows"]) > 0


def test_problem_submissions_history():
    """Verifies retrieving and clearing submission history for a problem."""
    prob_id = "sql-beginner:low-stock-inventory-alert"

    # Fetch submissions (may be empty initially or populated from runs)
    res = client.get(f"/api/problems/{prob_id}/submissions")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # Clear submissions
    del_res = client.delete(f"/api/problems/{prob_id}/submissions")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "ok"

    # Verify cleared
    res_after = client.get(f"/api/problems/{prob_id}/submissions")
    assert len(res_after.json()) == 0
