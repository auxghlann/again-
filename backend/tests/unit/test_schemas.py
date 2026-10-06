import pytest
from pydantic import ValidationError

from backend.schemas.execute import PythonRunRequest, SqlRunRequest
from backend.schemas.health import HealthResponse
from backend.schemas.plans import PlanProblemChecklistItem, StudyPlanDetailResponse
from backend.schemas.problems import SubmissionItem, TestCaseItem as SchemaTestCaseItem


def test_sql_run_request_defaults_and_validation():
    """Verifies that SqlRunRequest defaults is_submission to False and validates fields."""
    req = SqlRunRequest(problem_id="p1", user_sql="SELECT 1;")
    assert req.problem_id == "p1"
    assert req.user_sql == "SELECT 1;"
    assert req.is_submission is False

    # Missing required field raises ValidationError
    with pytest.raises(ValidationError):
        SqlRunRequest(problem_id="p1")  # missing user_sql


def test_python_run_request_defaults_and_validation():
    """Verifies that PythonRunRequest defaults is_submission to False."""
    req = PythonRunRequest(problem_id="py1", user_code="def solve(): pass")
    assert req.problem_id == "py1"
    assert req.user_code == "def solve(): pass"
    assert req.is_submission is False

    with pytest.raises(ValidationError):
        PythonRunRequest(user_code="pass")  # missing problem_id


def test_submission_item_serialization():
    """Verifies that SubmissionItem validates and parses fields correctly."""
    item = SubmissionItem(
        id="sub-123",
        problem_id="prob-1",
        language="SQL",
        status="Accepted",
        runtime_ms=45,
        submitted_code="SELECT * FROM t;",
        created_at="2026-10-06 20:00:00",
    )
    assert item.id == "sub-123"
    assert item.status == "Accepted"
    assert item.runtime_ms == 45


def test_test_case_item_structure():
    """Verifies SchemaTestCaseItem input and expected output dict structures."""
    case = SchemaTestCaseItem(
        id="tc-1",
        case_index=1,
        input={"a": 1, "b": 2},
        expected_output={"output": 3},
    )
    assert case.case_index == 1
    assert case.input["a"] == 1
    assert case.expected_output["output"] == 3


def test_study_plan_detail_response_structure():
    """Verifies StudyPlanDetailResponse correctly serializes checklist problems."""
    prob = PlanProblemChecklistItem(
        id="p1",
        title="Prob 1",
        order_index=1,
        difficulty="Easy",
        tags=["SQL"],
        language="SQL",
        solved=True,
    )
    plan = StudyPlanDetailResponse(
        id="plan-1",
        title="SQL 101",
        subtitle="Basic SQL",
        language="SQL",
        badge_text="Beginner",
        problems=[prob],
    )
    assert plan.id == "plan-1"
    assert len(plan.problems) == 1
    assert plan.problems[0].solved is True


def test_health_response_schema():
    """Verifies HealthResponse structure."""
    health = HealthResponse(status="online", db="connected", runner="connected", version="1.0.0")
    assert health.status == "online"
    assert health.db == "connected"
    assert health.runner == "connected"
