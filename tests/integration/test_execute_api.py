from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_execute_python_accepted_and_records_submission():
    """Verifies that a valid Two Sum solution passes all cases and logs submission only when is_submission is True."""
    prob_id = "python-basics:two-sum"

    # Clear prior submissions to ensure exact assertion
    client.delete(f"/api/problems/{prob_id}/submissions")

    correct_solution = """
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in seen:
                return [seen[diff], i]
            seen[num] = i
        return []
"""
    # 1. Scratchpad Run (is_submission=False) - executes but does NOT record a submission
    run_res = client.post(
        "/api/run/python",
        json={"problem_id": prob_id, "user_code": correct_solution, "is_submission": False},
    )
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["passed"] is True
    assert run_data["status"] == "Accepted"

    # Verify zero submissions recorded on run
    subs_res0 = client.get(f"/api/problems/{prob_id}/submissions")
    assert subs_res0.status_code == 200
    assert len(subs_res0.json()) == 0

    # 2. Official Submission (is_submission=True) - executes and records submission
    response = client.post(
        "/api/run/python",
        json={"problem_id": prob_id, "user_code": correct_solution, "is_submission": True},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["passed"] is True
    assert data["status"] == "Accepted"
    assert data["passed_count"] >= 3
    assert data["total_count"] >= 3
    assert data["error"] is None

    # Verify that a submission was logged
    subs_res = client.get(f"/api/problems/{prob_id}/submissions")
    assert subs_res.status_code == 200
    subs = subs_res.json()
    assert len(subs) == 1
    assert subs[0]["status"] == "Accepted"
    assert subs[0]["language"] == "Python"


def test_execute_python_wrong_answer():
    """Verifies that an incorrect solution returns Wrong Answer."""
    prob_id = "python-basics:two-sum"
    wrong_solution = """
class Solution:
    def twoSum(self, nums, target):
        return [0, 0]
"""
    response = client.post(
        "/api/run/python",
        json={"problem_id": prob_id, "user_code": wrong_solution},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["passed"] is False
    assert data["status"] == "Wrong Answer"
    assert data["passed_count"] < data["total_count"]


def test_execute_python_syntax_error():
    """Verifies that broken code returns Runtime Error with error trace."""
    prob_id = "python-basics:two-sum"
    broken_code = "def invalid_syntax(:"
    response = client.post(
        "/api/run/python",
        json={"problem_id": prob_id, "user_code": broken_code},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["passed"] is False
    assert data["status"] == "Runtime Error"
    assert data["error"] is not None


def test_execute_sql_graceful_handling():
    """Verifies that SQL execution handles disconnected PostgreSQL or syntax gracefully without 500 crashes."""
    prob_id = "sql-50:recyclable-and-low-fat-products"
    sql_code = "SELECT product_id FROM Products WHERE low_fats = 'Y' AND recyclable = 'Y';"

    response = client.post(
        "/api/run/sql",
        json={"problem_id": prob_id, "user_sql": sql_code},
    )
    assert response.status_code == 200
    data = response.json()
    assert "passed" in data
    assert "status" in data


def test_execute_non_existent_problem_returns_404():
    """Verifies that non-existent problem IDs yield 404."""
    py_res = client.post(
        "/api/run/python",
        json={"problem_id": "non-existent-problem", "user_code": "pass"},
    )
    assert py_res.status_code == 404

    sql_res = client.post(
        "/api/run/sql",
        json={"problem_id": "non-existent-problem", "user_sql": "SELECT 1;"},
    )
    assert sql_res.status_code == 404
