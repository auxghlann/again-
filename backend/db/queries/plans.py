from typing import Any, Dict, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Session

from backend.db.models import CodingProblem, StudyPlan, UserCodingSubmission
from backend.utils import safe_json_loads


# ============================================================
# Study Plans CRUD
# ============================================================

def create_study_plan(
    db: Session,
    id: str,
    title: str,
    subtitle: str,
    language: str,
    badge_text: str,
) -> StudyPlan:
    """Creates a new study plan track."""
    plan = StudyPlan(
        id=id,
        title=title,
        subtitle=subtitle,
        language=language,
        badge_text=badge_text,
    )
    db.add(plan)
    db.flush()
    return plan


def list_study_plans(db: Session) -> List[Dict[str, Any]]:
    """Returns all study plans with total problem count and user solved count."""
    prob_counts = (
        sa.select(
            CodingProblem.plan_id,
            sa.func.count(CodingProblem.id).label("total_problems"),
        )
        .group_by(CodingProblem.plan_id)
        .subquery()
    )

    solved_probs = (
        sa.select(
            CodingProblem.plan_id,
            sa.func.count(sa.distinct(CodingProblem.id)).label("solved_count"),
        )
        .join(UserCodingSubmission, CodingProblem.id == UserCodingSubmission.problem_id)
        .where(UserCodingSubmission.status == "Accepted")
        .group_by(CodingProblem.plan_id)
        .subquery()
    )

    stmt = (
        sa.select(
            StudyPlan.id,
            StudyPlan.title,
            StudyPlan.subtitle,
            StudyPlan.language,
            StudyPlan.badge_text,
            sa.func.coalesce(prob_counts.c.total_problems, 0).label("total_problems"),
            sa.func.coalesce(solved_probs.c.solved_count, 0).label("solved_count"),
        )
        .outerjoin(prob_counts, StudyPlan.id == prob_counts.c.plan_id)
        .outerjoin(solved_probs, StudyPlan.id == solved_probs.c.plan_id)
        .order_by(StudyPlan.title.asc())
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "subtitle": r.subtitle,
            "language": r.language,
            "badge_text": r.badge_text,
            "total_problems": r.total_problems,
            "solved_count": r.solved_count,
        }
        for r in rows
    ]


def get_study_plan(db: Session, plan_id: str) -> Optional[Dict[str, Any]]:
    """Returns a study plan alongside its list of problems and solved indicators."""
    plan = db.get(StudyPlan, plan_id)
    if not plan:
        return None

    solved_subq = (
        sa.select(UserCodingSubmission.problem_id)
        .where(UserCodingSubmission.status == "Accepted")
        .distinct()
        .subquery()
    )

    probs_stmt = (
        sa.select(
            CodingProblem.id,
            CodingProblem.title,
            CodingProblem.order_index,
            CodingProblem.difficulty,
            CodingProblem.tags_json,
            CodingProblem.language,
            sa.case((solved_subq.c.problem_id.isnot(None), 1), else_=0).label("solved"),
        )
        .outerjoin(solved_subq, CodingProblem.id == solved_subq.c.problem_id)
        .where(CodingProblem.plan_id == plan_id)
        .order_by(CodingProblem.order_index.asc(), CodingProblem.title.asc())
    )
    prob_rows = db.execute(probs_stmt).all()

    problems = [
        {
            "id": pr.id,
            "title": pr.title,
            "order_index": pr.order_index,
            "difficulty": pr.difficulty,
            "tags": safe_json_loads(pr.tags_json, default=[]),
            "language": pr.language,
            "solved": bool(pr.solved),
        }
        for pr in prob_rows
    ]

    return {
        "id": plan.id,
        "title": plan.title,
        "subtitle": plan.subtitle,
        "language": plan.language,
        "badge_text": plan.badge_text,
        "problems": problems,
    }


def update_study_plan(
    db: Session,
    plan_id: str,
    title: str,
    subtitle: str,
    language: str,
    badge_text: str,
) -> bool:
    """Updates an existing study plan."""
    plan = db.get(StudyPlan, plan_id)
    if not plan:
        return False
    plan.title = title
    plan.subtitle = subtitle
    plan.language = language
    plan.badge_text = badge_text
    db.flush()
    return True


def delete_study_plan(db: Session, plan_id: str) -> bool:
    """Deletes a study plan. Relies on ON DELETE SET NULL to preserve member coding problems."""
    plan = db.get(StudyPlan, plan_id)
    if not plan:
        return False
    db.delete(plan)
    db.flush()
    return True
