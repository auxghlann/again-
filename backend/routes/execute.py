from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db.database import get_db_session
from backend.db.queries.problems import get_coding_problem
from backend.db.queries.submissions import record_submission
from backend.runner.postgres import run_sql_sandbox
from backend.runner.python import run_python_sandbox
from backend.schemas.execute import (
    PythonRunRequest,
    PythonRunResponse,
    SqlRow,
    SqlRunRequest,
    SqlRunResponse,
)

router = APIRouter(prefix="/run", tags=["execute"])


@router.post("/sql", response_model=SqlRunResponse)
def execute_sql(
    payload: SqlRunRequest,
    db: Session = Depends(get_db_session),
) -> SqlRunResponse:
    """Executes analytical SQL in an isolated rollback transaction on PostgreSQL."""
    prob = get_coding_problem(db, payload.problem_id)
    if not prob:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coding problem '{payload.problem_id}' not found.",
        )

    # Get expected test case rows if present
    expected_rows: Optional[List[SqlRow]] = None
    cases = prob.get("cases") or []
    if cases:
        first_case = cases[0]
        expected_output = first_case.get("expected_output")
        if isinstance(expected_output, dict) and "rows" in expected_output:
            raw_rows = expected_output["rows"]
            if isinstance(raw_rows, list):
                expected_rows = raw_rows

    setup_sql = prob.get("setup_sql")
    canonical_sql = prob.get("canonical_solution")

    result = run_sql_sandbox(
        user_sql=payload.user_sql,
        setup_sql=setup_sql if isinstance(setup_sql, str) else None,
        canonical_sql=canonical_sql if isinstance(canonical_sql, str) else None,
        expected_rows=expected_rows,
    )

    # Record submission attempt only if is_submission is requested
    if payload.is_submission:
        record_submission(
            db=db,
            problem_id=payload.problem_id,
            language="SQL",
            status=result["status"],
            runtime_ms=result["runtime_ms"],
            submitted_code=payload.user_sql,
        )
        db.commit()

    return SqlRunResponse(
        passed=result["passed"],
        status=result["status"],
        runtime_ms=result["runtime_ms"],
        columns=result["columns"],
        rows=result["rows"],
        expected_rows=result["expected_rows"],
        diff=result["diff"],
        error=result["error"],
    )


@router.post("/python", response_model=PythonRunResponse)
def execute_python(
    payload: PythonRunRequest,
    db: Session = Depends(get_db_session),
) -> PythonRunResponse:
    """Executes Python user solution against test cases in an isolated subprocess with timeout."""
    prob = get_coding_problem(db, payload.problem_id)
    if not prob:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coding problem '{payload.problem_id}' not found.",
        )

    cases = prob.get("cases") or []
    result = run_python_sandbox(
        user_code=payload.user_code,
        test_cases=cases if isinstance(cases, list) else [],
        timeout_seconds=5.0,
    )

    # Record submission attempt only if is_submission is requested
    if payload.is_submission:
        record_submission(
            db=db,
            problem_id=payload.problem_id,
            language="Python",
            status=result["status"],
            runtime_ms=result["runtime_ms"],
            submitted_code=payload.user_code,
        )
        db.commit()

    return PythonRunResponse(
        passed=result["passed"],
        status=result["status"],
        passed_count=result["passed_count"],
        total_count=result["total_count"],
        runtime_ms=result["runtime_ms"],
        output=result["output"],
        error=result["error"],
    )
