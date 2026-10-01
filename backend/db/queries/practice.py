from typing import Any, Dict, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Session

from backend.db.models import PracticeTopic, QuizProgress, QuizQuestion
from backend.utils import safe_json_loads


# ============================================================
# Practice Topics CRUD
# ============================================================

def create_practice_topic(
    db: Session,
    id: str,
    title: str,
    topic: str,
    tool: str,
    icon: str,
    sort_order: int = 0,
) -> PracticeTopic:
    """Creates a new practice topic card."""
    item = PracticeTopic(
        id=id,
        title=title,
        topic=topic,
        tool=tool,
        icon=icon,
        sort_order=sort_order,
    )
    db.add(item)
    db.flush()
    return item


def list_practice_topics(db: Session) -> List[Dict[str, Any]]:
    """Returns all practice topic cards joined with question counts, answered count, and completed status."""
    q_counts = (
        sa.select(
            QuizQuestion.topic_id,
            sa.func.count(QuizQuestion.id).label("total_questions"),
        )
        .group_by(QuizQuestion.topic_id)
        .subquery()
    )

    stmt = (
        sa.select(
            PracticeTopic.id,
            PracticeTopic.title,
            PracticeTopic.topic,
            PracticeTopic.tool,
            PracticeTopic.icon,
            PracticeTopic.sort_order,
            sa.func.coalesce(q_counts.c.total_questions, 0).label("total_questions"),
            sa.func.coalesce(QuizProgress.done, False).label("done"),
            QuizProgress.answers_json,
        )
        .outerjoin(q_counts, PracticeTopic.id == q_counts.c.topic_id)
        .outerjoin(QuizProgress, PracticeTopic.id == QuizProgress.card_id)
        .order_by(PracticeTopic.sort_order.asc(), PracticeTopic.title.asc())
    )
    rows = db.execute(stmt).all()
    results = []
    for r in rows:
        answers = safe_json_loads(r.answers_json, default={})
        results.append({
            "id": r.id,
            "title": r.title,
            "topic": r.topic,
            "tool": r.tool,
            "icon": r.icon,
            "sort_order": r.sort_order,
            "total_questions": r.total_questions,
            "answered_count": len(answers),
            "done": bool(r.done),
        })
    return results


def get_practice_topic(db: Session, topic_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a single practice topic card by ID."""
    item = db.get(PracticeTopic, topic_id)
    if not item:
        return None
    return {
        "id": item.id,
        "title": item.title,
        "topic": item.topic,
        "tool": item.tool,
        "icon": item.icon,
        "sort_order": item.sort_order,
    }


def update_practice_topic(
    db: Session,
    topic_id: str,
    title: str,
    topic: str,
    tool: str,
    icon: str,
    sort_order: int,
) -> bool:
    """Updates an existing practice topic card."""
    item = db.get(PracticeTopic, topic_id)
    if not item:
        return False
    item.title = title
    item.topic = topic
    item.tool = tool
    item.icon = icon
    item.sort_order = sort_order
    db.flush()
    return True


def delete_practice_topic(db: Session, topic_id: str) -> bool:
    """Deletes a practice topic card. Relies on ON DELETE CASCADE for questions and progress."""
    item = db.get(PracticeTopic, topic_id)
    if not item:
        return False
    db.delete(item)
    db.flush()
    return True


# ============================================================
# Quiz Questions CRUD
# ============================================================

def create_quiz_question(
    db: Session,
    id: str,
    topic_id: str,
    type: str,
    prompt: str,
    options: Optional[List[str]] = None,
    correct_val: Optional[str] = None,
    canonical_answer: Optional[str] = None,
    explanation: str = "",
    order_index: int = 0,
) -> QuizQuestion:
    """Creates a conceptual quiz question (mcq, tf, or fib)."""
    q = QuizQuestion(
        id=id,
        topic_id=topic_id,
        type=type,
        prompt=prompt,
        options_json=options,
        correct_val=correct_val,
        canonical_answer=canonical_answer,
        explanation=explanation,
        order_index=order_index,
    )
    db.add(q)
    db.flush()
    return q


def get_quiz_questions(db: Session, topic_id: str) -> List[Dict[str, Any]]:
    """Returns all questions for a given topic ordered by order_index with parsed options and typed correct values."""
    stmt = (
        sa.select(QuizQuestion)
        .where(QuizQuestion.topic_id == topic_id)
        .order_by(QuizQuestion.order_index.asc(), QuizQuestion.id.asc())
    )
    rows = db.scalars(stmt).all()
    results = []
    for r in rows:
        q_type = r.type
        options = r.options_json

        correct: Any = None
        if q_type == "mcq" and r.correct_val is not None:
            try:
                correct = int(r.correct_val)
            except ValueError:
                correct = r.correct_val
        elif q_type == "tf" and r.correct_val is not None:
            correct = str(r.correct_val).lower() == "true"

        item: Dict[str, Any] = {
            "id": r.id,
            "topic_id": r.topic_id,
            "type": q_type,
            "prompt": r.prompt,
            "explanation": r.explanation,
            "order_index": r.order_index,
        }
        if options is not None:
            item["options"] = options
        if correct is not None:
            item["correct"] = correct
        if r.canonical_answer is not None:
            item["answer"] = r.canonical_answer

        results.append(item)
    return results


def get_quiz_question(db: Session, question_id: str) -> Optional[Dict[str, Any]]:
    """Fetches an individual quiz question by ID."""
    q = db.get(QuizQuestion, question_id)
    if not q:
        return None
    return {
        "id": q.id,
        "topic_id": q.topic_id,
        "type": q.type,
        "prompt": q.prompt,
        "options": q.options_json,
        "correct_val": q.correct_val,
        "canonical_answer": q.canonical_answer,
        "explanation": q.explanation,
        "order_index": q.order_index,
    }


def update_quiz_question(
    db: Session,
    question_id: str,
    prompt: str,
    options: Optional[List[str]],
    correct_val: Optional[str],
    canonical_answer: Optional[str],
    explanation: str,
    order_index: int,
) -> bool:
    """Updates an existing quiz question."""
    q = db.get(QuizQuestion, question_id)
    if not q:
        return False
    q.prompt = prompt
    q.options_json = options
    q.correct_val = correct_val
    q.canonical_answer = canonical_answer
    q.explanation = explanation
    q.order_index = order_index
    db.flush()
    return True


def delete_quiz_question(db: Session, question_id: str) -> bool:
    """Deletes an individual quiz question."""
    q = db.get(QuizQuestion, question_id)
    if not q:
        return False
    db.delete(q)
    db.flush()
    return True


# ============================================================
# Quiz Progress Controls
# ============================================================

def get_quiz_progress(db: Session, card_id: str) -> Optional[Dict[str, Any]]:
    """Returns the current progress state for a practice card."""
    prog = db.get(QuizProgress, card_id)
    if not prog:
        return None
    return {
        "card_id": prog.card_id,
        "current_index": prog.current_index,
        "done": bool(prog.done),
        "answers": safe_json_loads(prog.answers_json, default={}),
        "updated_at": str(prog.updated_at),
    }


def upsert_quiz_progress(
    db: Session,
    card_id: str,
    current_index: int,
    answers: Dict[str, Any],
    done: bool,
) -> None:
    """Inserts or updates the quiz session progress for a practice card."""
    prog = db.get(QuizProgress, card_id)
    if prog:
        prog.current_index = current_index
        prog.answers_json = answers
        prog.done = done
    else:
        prog = QuizProgress(
            card_id=card_id,
            current_index=current_index,
            answers_json=answers,
            done=done,
        )
        db.add(prog)
    db.flush()


def reset_quiz_progress(db: Session, card_id: str) -> bool:
    """Resets user progress for a card back to index 0 with an empty answer map."""
    prog = db.get(QuizProgress, card_id)
    if not prog:
        return False
    prog.current_index = 0
    prog.done = False
    prog.answers_json = {}
    db.flush()
    return True


def delete_quiz_progress(db: Session, card_id: str) -> bool:
    """Deletes progress record entirely, returning card to unattempted state."""
    prog = db.get(QuizProgress, card_id)
    if not prog:
        return False
    db.delete(prog)
    db.flush()
    return True
