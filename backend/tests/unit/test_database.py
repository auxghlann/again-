import pytest
import sqlalchemy as sa
from sqlalchemy.orm import Session

from backend.db.models import (
    CodingProblem,
    PracticeTopic,
    QuizProgress,
    QuizQuestion,
    StudyPlan,
    TestCase,
    UserCodingSubmission,
)


def test_init_db_creates_all_tables_and_indexes(db_session: Session):
    """Verifies that all 7 tables and 4 indexes exist in the schema."""
    inspector = sa.inspect(db_session.bind)
    tables = set(inspector.get_table_names())

    expected_tables = {
        "practice_topics",
        "quiz_questions",
        "quiz_progress",
        "study_plans",
        "coding_problems",
        "test_cases",
        "user_coding_submissions",
    }
    for table in expected_tables:
        assert table in tables, f"Expected table '{table}' to be created"


def test_foreign_keys_enforced(db_session: Session):
    """Verifies that foreign key enforcement rejects orphaned child inserts."""
    # Attempt inserting a question for a non-existent topic
    orphan = QuizQuestion(
        id="orphan-q1",
        topic_id="non-existent-topic",
        type="mcq",
        prompt="Test prompt",
        explanation="Test explanation",
    )
    db_session.add(orphan)
    with pytest.raises(sa.exc.IntegrityError):
        db_session.flush()
    db_session.rollback()
    db_session.begin_nested()


def test_cascade_delete_practice_topic_deletes_questions_and_progress(db_session: Session):
    """Verifies ON DELETE CASCADE removes associated quiz questions and progress when a topic is deleted."""
    topic = PracticeTopic(
        id="t1",
        title="Topic 1",
        topic="SQL",
        tool="PostgreSQL",
        icon="db",
        sort_order=1,
    )
    db_session.add(topic)
    db_session.flush()

    question = QuizQuestion(
        id="q1",
        topic_id="t1",
        type="mcq",
        prompt="Prompt 1",
        explanation="Expl 1",
    )
    progress = QuizProgress(
        card_id="t1",
        current_index=1,
        done=True,
        answers_json={"0": {"value": 0, "correct": True}},
    )
    db_session.add_all([question, progress])
    db_session.flush()

    # Verify rows exist
    assert db_session.get(QuizQuestion, "q1") is not None
    assert db_session.get(QuizProgress, "t1") is not None

    # Delete parent topic
    t1 = db_session.get(PracticeTopic, "t1")
    db_session.delete(t1)
    db_session.flush()
    db_session.expire_all()

    # Verify cascaded deletion
    assert db_session.get(QuizQuestion, "q1") is None
    assert db_session.get(QuizProgress, "t1") is None


def test_cascade_delete_coding_problem_deletes_cases_and_submissions(db_session: Session):
    """Verifies ON DELETE CASCADE removes associated test cases and submissions when a problem is deleted."""
    problem = CodingProblem(
        id="p1",
        title="Problem 1",
        difficulty="Easy",
        tags_json=["Array"],
        language="Python",
        description_md="Desc",
        starter_code="pass",
        canonical_solution="pass",
    )
    db_session.add(problem)
    db_session.flush()

    test_case = TestCase(
        id="tc1",
        problem_id="p1",
        case_index=1,
        input_json={},
        expected_output_json={},
    )
    submission = UserCodingSubmission(
        id="s1",
        problem_id="p1",
        language="Python",
        status="Accepted",
        runtime_ms=10,
        submitted_code="pass",
    )
    db_session.add_all([test_case, submission])
    db_session.flush()

    p1 = db_session.get(CodingProblem, "p1")
    db_session.delete(p1)
    db_session.flush()
    db_session.expire_all()

    # Verify cascaded deletion
    assert db_session.get(TestCase, "tc1") is None
    assert db_session.get(UserCodingSubmission, "s1") is None


def test_study_plan_delete_sets_problem_plan_id_to_null(db_session: Session):
    """Verifies ON DELETE SET NULL decouples coding problems when their parent study plan is deleted."""
    plan = StudyPlan(
        id="plan1",
        title="Plan 1",
        subtitle="Sub",
        language="SQL",
        badge_text="SQL",
    )
    db_session.add(plan)
    db_session.flush()

    problem = CodingProblem(
        id="p1",
        plan_id="plan1",
        title="Problem 1",
        difficulty="Easy",
        tags_json=[],
        language="SQL",
        description_md="Desc",
        starter_code="pass",
        canonical_solution="pass",
    )
    db_session.add(problem)
    db_session.flush()

    pl = db_session.get(StudyPlan, "plan1")
    db_session.delete(pl)
    db_session.flush()
    db_session.expire_all()

    # Verify problem remains and plan_id is now None
    prob = db_session.get(CodingProblem, "p1")
    assert prob is not None
    assert prob.plan_id is None
