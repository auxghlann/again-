from typing import Any, Dict, List, Optional
import uuid
import sqlalchemy as sa
from sqlalchemy.orm import Session

from backend.db.models import UserCodingSubmission


# ============================================================
# User Coding Submissions Controls
# ============================================================

def record_submission(
    db: Session,
    problem_id: str,
    language: str,
    status: str,
    runtime_ms: int,
    submitted_code: str,
    submission_id: Optional[str] = None,
) -> str:
    """Records a code execution attempt and returns its UUID."""
    sub_id = submission_id or str(uuid.uuid4())
    sub = UserCodingSubmission(
        id=sub_id,
        problem_id=problem_id,
        language=language,
        status=status,
        runtime_ms=runtime_ms,
        submitted_code=submitted_code,
    )
    db.add(sub)
    db.flush()
    return sub_id


def list_submissions(db: Session, problem_id: str) -> List[Dict[str, Any]]:
    """Returns recent submission attempts for a problem, ordered by most recent first."""
    stmt = (
        sa.select(UserCodingSubmission)
        .where(UserCodingSubmission.problem_id == problem_id)
        .order_by(UserCodingSubmission.created_at.desc(), UserCodingSubmission.id.desc())
    )
    rows = db.scalars(stmt).all()
    return [
        {
            "id": r.id,
            "problem_id": r.problem_id,
            "language": r.language,
            "status": r.status,
            "runtime_ms": r.runtime_ms,
            "submitted_code": r.submitted_code,
            "created_at": str(r.created_at),
        }
        for r in rows
    ]


def delete_submission(db: Session, submission_id: str) -> bool:
    """Deletes an individual submission record."""
    sub = db.get(UserCodingSubmission, submission_id)
    if not sub:
        return False
    db.delete(sub)
    db.flush()
    return True


def clear_problem_submissions(db: Session, problem_id: str) -> int:
    """Clears all historical submissions for a specific problem and returns the count deleted."""
    stmt = sa.delete(UserCodingSubmission).where(UserCodingSubmission.problem_id == problem_id)
    result = db.execute(stmt)
    db.flush()
    return result.rowcount
