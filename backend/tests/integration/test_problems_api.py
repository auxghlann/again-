def test_get_study_plans_catalog(client):
    """Verifies that /api/plans returns seeded study tracks with expected schema."""
    response = client.get("/api/plans")
    assert response.status_code == 200
    plans = response.json()
    assert len(plans) >= 1

    first = plans[0]
    assert "id" in first
    assert "title" in first
    assert "language" in first
    assert "total_problems" in first
    assert "solved_count" in first
    assert any(p["id"] == "sql-beginner" for p in plans)


def test_get_study_plan_detail(client):
    """Verifies that /api/plans/{id} returns the plan and its problem checklist."""
    plan_id = "sql-beginner"
    response = client.get(f"/api/plans/{plan_id}")
    assert response.status_code == 200
    plan = response.json()

    assert plan["id"] == plan_id
    assert plan["language"] == "SQL"
    assert len(plan["problems"]) >= 1

    prob1 = plan["problems"][0]
    assert "id" in prob1
    assert "title" in prob1
    assert "difficulty" in prob1
    assert "solved" in prob1


def test_get_coding_problem_detail(client):
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


def test_problem_submissions_history(client):
    """Verifies retrieving submissions history for a problem."""
    prob_id = "sql-beginner:low-stock-inventory-alert"

    res = client.get(f"/api/problems/{prob_id}/submissions")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_delete_individual_submission(client):
    """Verifies DELETE /api/submissions/{submission_id} deletes a single submission."""
    prob_id = "sql-beginner:low-stock-inventory-alert"

    # 1. Create a submission
    run_res = client.post(
        "/api/run/sql",
        json={"problem_id": prob_id, "user_sql": "SELECT 1;", "is_submission": True},
    )
    assert run_res.status_code == 200

    subs = client.get(f"/api/problems/{prob_id}/submissions").json()
    assert len(subs) >= 1
    target_id = subs[0]["id"]

    # 2. Delete only this single submission
    del_res = client.delete(f"/api/submissions/{target_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "ok"

    # 3. Verify target submission is no longer in list
    remaining_subs = client.get(f"/api/problems/{prob_id}/submissions").json()
    assert all(s["id"] != target_id for s in remaining_subs)

    # 4. Deleting non-existent submission returns 404
    del_404 = client.delete("/api/submissions/non-existent-sub-id-xyz")
    assert del_404.status_code == 404


def test_toggle_problem_solved(client):
    """Verifies toggling problem solved status on and off."""
    prob_id = "sql-beginner:customer-email-domain-cleaner"

    # Fetch initial state
    res_plan_init = client.get("/api/plans/sql-beginner")
    initial_prob = next(p for p in res_plan_init.json()["problems"] if p["id"] == prob_id)
    initial_solved = initial_prob["solved"]

    # Toggle state
    res_toggle1 = client.post(f"/api/problems/{prob_id}/toggle-solved")
    assert res_toggle1.status_code == 200
    assert res_toggle1.json()["solved"] == (not initial_solved)

    # Check plan shows updated state
    res_plan1 = client.get("/api/plans/sql-beginner")
    prob_toggled = next(p for p in res_plan1.json()["problems"] if p["id"] == prob_id)
    assert prob_toggled["solved"] == (not initial_solved)

    # Toggle back to original state
    res_toggle2 = client.post(f"/api/problems/{prob_id}/toggle-solved")
    assert res_toggle2.status_code == 200
    assert res_toggle2.json()["solved"] == initial_solved

    # Check plan shows restored state
    res_plan2 = client.get("/api/plans/sql-beginner")
    prob_restored = next(p for p in res_plan2.json()["problems"] if p["id"] == prob_id)
    assert prob_restored["solved"] == initial_solved
