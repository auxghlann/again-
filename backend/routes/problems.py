from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db.database import get_db_session
from backend.db.queries.plans import get_study_plan
from backend.db.queries.problems import get_coding_problem
from backend.db.queries.submissions import (
    clear_problem_submissions,
    delete_submission,
    list_submissions,
)
from backend.schemas.plans import PlanProblemChecklistItem, StudyPlanDetailResponse
from backend.schemas.problems import (
    CodingProblemDetailResponse,
    SubmissionItem,
    TestCaseItem,
)

router = APIRouter(tags=["problems"])


@router.get("/plans/{plan_id}", response_model=StudyPlanDetailResponse)
def get_plan_detail(
    plan_id: str,
    db: Session = Depends(get_db_session),
) -> StudyPlanDetailResponse:
    """Returns study plan checklist with problem solved indicators."""
    plan = get_study_plan(db, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study plan '{plan_id}' not found.",
        )

    problems = [
        PlanProblemChecklistItem(
            id=p["id"],
            title=p["title"],
            order_index=p.get("order_index", 0),
            difficulty=p["difficulty"],
            tags=p.get("tags", []),
            language=p.get("language", plan["language"]),
            solved=p.get("solved", False),
        )
        for p in plan.get("problems", [])
    ]

    return StudyPlanDetailResponse(
        id=plan["id"],
        title=plan["title"],
        subtitle=plan["subtitle"],
        language=plan["language"],
        badge_text=plan["badge_text"],
        problems=problems,
    )


@router.get("/problems/{problem_id}", response_model=CodingProblemDetailResponse)
def get_problem_detail(
    problem_id: str,
    db: Session = Depends(get_db_session),
) -> CodingProblemDetailResponse:
    """Returns full problem context, starter code, and test cases for workspace."""
    prob = get_coding_problem(db, problem_id)
    if not prob:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coding problem '{problem_id}' not found.",
        )

    cases = [
        TestCaseItem(
            id=c.get("id"),
            case_index=c["case_index"],
            input=c["input"],
            expected_output=c.get("expected_output"),
        )
        for c in prob.get("cases", [])
    ]

    return CodingProblemDetailResponse(
        id=prob["id"],
        plan_id=prob.get("plan_id"),
        title=prob["title"],
        order_index=prob.get("order_index", 0),
        difficulty=prob["difficulty"],
        tags=prob.get("tags", []),
        language=prob["language"],
        description_md=prob["description_md"],
        starter_code=prob["starter_code"],
        setup_sql=prob.get("setup_sql"),
        canonical_solution=prob.get("canonical_solution"),
        cases=cases,
    )


@router.get("/problems/{problem_id}/submissions", response_model=List[SubmissionItem])
def get_problem_submissions(
    problem_id: str,
    db: Session = Depends(get_db_session),
) -> List[SubmissionItem]:
    """Returns recent submission attempts for a coding problem."""
    subs = list_submissions(db, problem_id)
    return [SubmissionItem.model_validate(s) for s in subs]


@router.delete("/problems/{problem_id}/submissions")
def clear_submissions(
    problem_id: str,
    db: Session = Depends(get_db_session),
) -> Dict[str, Any]:
    """Clears all historical submissions for a coding problem."""
    count = clear_problem_submissions(db, problem_id)
    db.commit()
    return {"status": "ok", "deleted_count": count}


@router.delete("/submissions/{submission_id}")
def remove_submission(
    submission_id: str,
    db: Session = Depends(get_db_session),
) -> Dict[str, Any]:
    """Deletes an individual submission record."""
    deleted = delete_submission(db, submission_id)
    db.commit()
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission '{submission_id}' not found.",
        )
    return {"status": "ok"}
