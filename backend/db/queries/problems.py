from typing import Any, Dict, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Session

from backend.db.models import CodingProblem, TestCase
from backend.utils import safe_json_loads


# ============================================================
# Coding Problems CRUD
# ============================================================

def create_coding_problem(
    db: Session,
    id: str,
    plan_id: Optional[str],
    title: str,
    order_index: int,
    difficulty: str,
    tags: List[str],
    language: str,
    description_md: str,
    starter_code: str,
    setup_sql: Optional[str] = None,
    canonical_solution: str = "",
) -> CodingProblem:
    """Creates a new coding problem."""
    prob = CodingProblem(
        id=id,
        plan_id=plan_id,
        title=title,
        order_index=order_index,
        difficulty=difficulty,
        tags_json=tags,
        language=language,
        description_md=description_md,
        starter_code=starter_code,
        setup_sql=setup_sql,
        canonical_solution=canonical_solution,
    )
    db.add(prob)
    db.flush()
    return prob


def get_coding_problem(db: Session, problem_id: str) -> Optional[Dict[str, Any]]:
    """Returns problem details with parsed tags and test cases."""
    prob = db.get(CodingProblem, problem_id)
    if not prob:
        return None

    cases = get_test_cases(db, problem_id)
    return {
        "id": prob.id,
        "plan_id": prob.plan_id,
        "title": prob.title,
        "order_index": prob.order_index,
        "difficulty": prob.difficulty,
        "tags": safe_json_loads(prob.tags_json, default=[]),
        "language": prob.language,
        "description_md": prob.description_md,
        "starter_code": prob.starter_code,
        "setup_sql": prob.setup_sql,
        "canonical_solution": prob.canonical_solution,
        "cases": cases,
    }


def update_coding_problem(
    db: Session,
    problem_id: str,
    title: str,
    difficulty: str,
    tags: List[str],
    description_md: str,
    starter_code: str,
    setup_sql: Optional[str],
    canonical_solution: str,
) -> bool:
    """Updates an existing coding problem."""
    prob = db.get(CodingProblem, problem_id)
    if not prob:
        return False
    prob.title = title
    prob.difficulty = difficulty
    prob.tags_json = tags
    prob.description_md = description_md
    prob.starter_code = starter_code
    prob.setup_sql = setup_sql
    prob.canonical_solution = canonical_solution
    db.flush()
    return True


def delete_coding_problem(db: Session, problem_id: str) -> bool:
    """Deletes a coding problem. Relies on ON DELETE CASCADE for test cases and submissions."""
    prob = db.get(CodingProblem, problem_id)
    if not prob:
        return False
    db.delete(prob)
    db.flush()
    return True


# ============================================================
# Test Cases CRUD
# ============================================================

def create_test_case(
    db: Session,
    id: str,
    problem_id: str,
    case_index: int,
    input_data: Dict[str, Any],
    expected_output: Dict[str, Any],
) -> TestCase:
    """Creates a test case fixture for a coding problem."""
    tc = TestCase(
        id=id,
        problem_id=problem_id,
        case_index=case_index,
        input_json=input_data,
        expected_output_json=expected_output,
    )
    db.add(tc)
    db.flush()
    return tc


def get_test_cases(db: Session, problem_id: str) -> List[Dict[str, Any]]:
    """Returns all test cases for a problem ordered by case_index."""
    stmt = (
        sa.select(TestCase)
        .where(TestCase.problem_id == problem_id)
        .order_by(TestCase.case_index.asc())
    )
    cases = db.scalars(stmt).all()
    return [
        {
            "id": tc.id,
            "problem_id": tc.problem_id,
            "case_index": tc.case_index,
            "input": safe_json_loads(tc.input_json, default={}),
            "expected_output": safe_json_loads(tc.expected_output_json, default={}),
        }
        for tc in cases
    ]


def update_test_case(
    db: Session,
    test_case_id: str,
    case_index: int,
    input_data: Dict[str, Any],
    expected_output: Dict[str, Any],
) -> bool:
    """Updates an existing test case."""
    tc = db.get(TestCase, test_case_id)
    if not tc:
        return False
    tc.case_index = case_index
    tc.input_json = input_data
    tc.expected_output_json = expected_output
    db.flush()
    return True


def delete_test_case(db: Session, test_case_id: str) -> bool:
    """Deletes an individual test case."""
    tc = db.get(TestCase, test_case_id)
    if not tc:
        return False
    db.delete(tc)
    db.flush()
    return True
