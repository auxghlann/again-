from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_execute_sql_accepted_and_records_submission():
    """Verifies that a valid SQL solution passes execution and logs submission only when is_submission is True."""
    prob_id = "sql-beginner:low-stock-inventory-alert"

    # Clear prior submissions to ensure exact assertion
    client.delete(f"/api/problems/{prob_id}/submissions")

    correct_solution = """
SELECT item_id, item_name, category, quantity_in_stock
FROM Inventory
WHERE is_discontinued = false AND quantity_in_stock <= reorder_threshold
ORDER BY quantity_in_stock ASC, item_id ASC;
"""
    # 1. Scratchpad Run (is_submission=False) - executes but does NOT record a submission
    run_res = client.post(
        "/api/run/sql",
        json={"problem_id": prob_id, "user_sql": correct_solution, "is_submission": False},
    )
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["passed"] is True
    assert run_data["status"] == "Accepted"
    assert len(run_data["rows"]) == 3

    # Verify zero submissions recorded on scratchpad run
    subs_res0 = client.get(f"/api/problems/{prob_id}/submissions")
    assert subs_res0.status_code == 200
    assert len(subs_res0.json()) == 0

    # 2. Official Submission (is_submission=True) - executes and records submission
    response = client.post(
        "/api/run/sql",
        json={"problem_id": prob_id, "user_sql": correct_solution, "is_submission": True},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["passed"] is True
    assert data["status"] == "Accepted"
    assert data["error"] is None

    # Verify that a submission was logged
    subs_res = client.get(f"/api/problems/{prob_id}/submissions")
    assert subs_res.status_code == 200
    subs = subs_res.json()
    assert len(subs) == 1
    assert subs[0]["status"] == "Accepted"
    assert subs[0]["language"] == "SQL"


def test_execute_sql_wrong_answer():
    """Verifies that an incorrect SQL query returns Wrong Answer."""
    prob_id = "sql-beginner:low-stock-inventory-alert"
    wrong_solution = "SELECT item_id, item_name, category, quantity_in_stock FROM Inventory WHERE 1=0;"

    response = client.post(
        "/api/run/sql",
        json={"problem_id": prob_id, "user_sql": wrong_solution},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["passed"] is False
    assert data["status"] == "Wrong Answer"


def test_execute_sql_syntax_error():
    """Verifies that malformed SQL returns Runtime Error with error trace."""
    prob_id = "sql-beginner:low-stock-inventory-alert"
    broken_sql = "SELEC * FROMM NonExistentTable;"

    response = client.post(
        "/api/run/sql",
        json={"problem_id": prob_id, "user_sql": broken_sql},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["passed"] is False
    assert data["status"] == "Runtime Error"
    assert data["error"] is not None


def test_execute_sql_advance_window_functions():
    """Verifies that advanced SQL queries utilizing window functions execute cleanly."""
    prob_id = "sql-advance:rank-scores"
    solution = "SELECT score, DENSE_RANK() OVER (ORDER BY score DESC) AS rank FROM Scores ORDER BY score DESC;"

    response = client.post(
        "/api/run/sql",
        json={"problem_id": prob_id, "user_sql": solution, "is_submission": True},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] is True
    assert data["status"] == "Accepted"
    assert len(data["rows"]) == 6


def test_execute_non_existent_problem_returns_404():
    """Verifies that non-existent problem IDs yield 404."""
    sql_res = client.post(
        "/api/run/sql",
        json={"problem_id": "non-existent-problem", "user_sql": "SELECT 1;"},
    )
    assert sql_res.status_code == 404
