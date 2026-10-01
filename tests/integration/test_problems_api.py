from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_get_study_plans_catalog():
    """Verifies that /api/plans returns all seeded study tracks."""
    response = client.get("/api/plans")
    assert response.status_code == 200
    plans = response.json()
    assert len(plans) >= 5

    first = plans[0]
    assert "id" in first
    assert "title" in first
    assert "language" in first
    assert "total_problems" in first
    assert "solved_count" in first


def test_get_study_plan_detail():
    """Verifies that /api/plans/{id} returns the plan and its problem checklist."""
    plan_id = "python-basics"
    response = client.get(f"/api/plans/{plan_id}")
    assert response.status_code == 200
    plan = response.json()

    assert plan["id"] == plan_id
    assert plan["language"] == "Python"
    assert len(plan["problems"]) > 0

    prob1 = plan["problems"][0]
    assert "id" in prob1
    assert "title" in prob1
    assert "difficulty" in prob1
    assert "solved" in prob1


def test_get_coding_problem_detail():
    """Verifies that /api/problems/{id} returns description, starter code, and test cases."""
    prob_id = "python-basics:two-sum"
    response = client.get(f"/api/problems/{prob_id}")
    assert response.status_code == 200
    prob = response.json()

    assert prob["id"] == prob_id
    assert prob["title"] == "Two Sum"
    assert prob["difficulty"] == "Easy"
    assert "description_md" in prob
    assert "starter_code" in prob
    assert len(prob["cases"]) >= 3

    c1 = prob["cases"][0]
    assert c1["case_index"] == 1
    assert "input" in c1


def test_problem_submissions_history():
    """Verifies retrieving and clearing submission history for a problem."""
    prob_id = "python-basics:two-sum"

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
