from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db.database import get_db_session
from backend.db.queries.practice import (
    delete_quiz_progress,
    get_practice_topic,
    get_quiz_progress,
    get_quiz_questions,
    reset_quiz_progress,
    upsert_quiz_progress,
)
from backend.schemas.practice import (
    QuizCardHeader,
    QuizDetailResponse,
    QuizProgressActionResponse,
    QuizProgressState,
    QuizProgressUpsertRequest,
    QuizQuestionItem,
)

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("/{topic_id}", response_model=QuizDetailResponse)
def get_quiz_detail(
    topic_id: str,
    db: Session = Depends(get_db_session),
) -> QuizDetailResponse:
    """Returns question bank and active user progress for a conceptual topic."""
    topic = get_practice_topic(db, topic_id)
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Practice topic '{topic_id}' not found.",
        )

    card_header = QuizCardHeader(
        id=topic["id"],
        title=topic["title"],
        topic=topic["topic"],
        tool=topic["tool"],
        icon=topic["icon"],
    )

    raw_questions = get_quiz_questions(db, topic_id)
    questions = [
        QuizQuestionItem(
            id=q["id"],
            type=q["type"],
            prompt=q["prompt"],
            options=q.get("options"),
            correct=q.get("correct"),
            answer=q.get("answer"),
            explain=q.get("explanation", ""),
            order_index=q.get("order_index", 0),
        )
        for q in raw_questions
    ]

    raw_progress = get_quiz_progress(db, topic_id)
    progress = (
        QuizProgressState(
            card_id=raw_progress["card_id"],
            current_index=raw_progress["current_index"],
            done=raw_progress["done"],
            answers=raw_progress["answers"],
            updated_at=raw_progress.get("updated_at"),
        )
        if raw_progress
        else None
    )

    return QuizDetailResponse(
        card=card_header,
        questions=questions,
        progress=progress,
    )


@router.post("/{topic_id}/progress", response_model=QuizProgressActionResponse)
def save_quiz_progress(
    topic_id: str,
    payload: QuizProgressUpsertRequest,
    db: Session = Depends(get_db_session),
) -> QuizProgressActionResponse:
    """Upserts user progress and answers for a practice quiz card."""
    topic = get_practice_topic(db, topic_id)
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Practice topic '{topic_id}' not found.",
        )

    upsert_quiz_progress(
        db,
        card_id=topic_id,
        current_index=payload.current_index,
        answers=payload.answers,
        done=payload.done,
    )
    db.commit()

    return QuizProgressActionResponse(
        status="ok",
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/{topic_id}/reset", response_model=QuizProgressActionResponse)
def reset_progress(
    topic_id: str,
    db: Session = Depends(get_db_session),
) -> QuizProgressActionResponse:
    """Resets progress back to question 0 with an empty answer map."""
    reset_quiz_progress(db, topic_id)
    db.commit()

    return QuizProgressActionResponse(
        status="ok",
        updated_at=datetime.now(timezone.utc).isoformat(),
    )


@router.delete("/{topic_id}/progress", response_model=QuizProgressActionResponse)
def remove_progress(
    topic_id: str,
    db: Session = Depends(get_db_session),
) -> QuizProgressActionResponse:
    """Deletes progress record entirely, returning card to unattempted state."""
    delete_quiz_progress(db, topic_id)
    db.commit()

    return QuizProgressActionResponse(
        status="ok",
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
