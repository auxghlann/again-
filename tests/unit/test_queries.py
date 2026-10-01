import pytest
from sqlalchemy.orm import Session, sessionmaker

from backend.db.database import get_engine, init_db
from backend.db.queries import (
    clear_problem_submissions,
    create_coding_problem,
    create_practice_topic,
    create_quiz_question,
    create_study_plan,
    create_test_case,
    delete_coding_problem,
    delete_practice_topic,
    delete_quiz_progress,
    delete_quiz_question,
    delete_study_plan,
    delete_submission,
    delete_test_case,
    get_coding_problem,
    get_practice_topic,
    get_quiz_progress,
    get_quiz_question,
    get_quiz_questions,
    get_study_plan,
    get_test_cases,
    list_practice_topics,
    list_study_plans,
    list_submissions,
    record_submission,
    reset_quiz_progress,
    update_coding_problem,
    update_practice_topic,
    update_quiz_question,
    update_study_plan,
    update_test_case,
    upsert_quiz_progress,
)
from backend.db.seed import seed_db


@pytest.fixture
def db_session():
    """Provides a fresh in-memory SQLite session with initialized schema."""
    engine = get_engine("sqlite:///:memory:")
    init_db(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def test_practice_topics_crud(db_session: Session):
    """Verifies Create, Read, Update, and Delete on practice_topics."""
    create_practice_topic(db_session, "t1", "Snowflake 101", "SQL", "Snowflake", "snow", 1)

    # Read
    topic = get_practice_topic(db_session, "t1")
    assert topic is not None
    assert topic["title"] == "Snowflake 101"
    assert topic["topic"] == "SQL"

    # Update
    updated = update_practice_topic(db_session, "t1", "Snowflake Advanced", "SQL", "Snowflake", "snow", 2)
    assert updated is True
    topic_after = get_practice_topic(db_session, "t1")
    assert topic_after["title"] == "Snowflake Advanced"
    assert topic_after["sort_order"] == 2

    # Delete
    deleted = delete_practice_topic(db_session, "t1")
    assert deleted is True
    assert get_practice_topic(db_session, "t1") is None


def test_quiz_questions_crud(db_session: Session):
    """Verifies Create, Read, Update, and Delete on quiz_questions with MCQ, TF, and FIB."""
    create_practice_topic(db_session, "t1", "Topic", "SQL", "PostgreSQL", "db", 1)

    # MCQ
    create_quiz_question(
        db_session, "q1", "t1", "mcq", "Select 1?", ["A", "B"], "0", None, "Explain 1", 0
    )
    # TF
    create_quiz_question(
        db_session, "q2", "t1", "tf", "Is SQL fun?", None, "true", None, "Explain 2", 1
    )
    # FIB
    create_quiz_question(
        db_session, "q3", "t1", "fib", "Fill ___ in.", None, None, "blank", "Explain 3", 2
    )

    questions = get_quiz_questions(db_session, "t1")
    assert len(questions) == 3

    assert questions[0]["type"] == "mcq"
    assert questions[0]["options"] == ["A", "B"]
    assert questions[0]["correct"] == 0

    assert questions[1]["type"] == "tf"
    assert questions[1]["correct"] is True

    assert questions[2]["type"] == "fib"
    assert questions[2]["answer"] == "blank"

    # Get single question
    q1 = get_quiz_question(db_session, "q1")
    assert q1 is not None
    assert q1["prompt"] == "Select 1?"

    # Update question
    updated = update_quiz_question(
        db_session, "q1", "Select 2?", ["C", "D"], "1", None, "Explain updated", 0
    )
    assert updated is True
    q1_after = get_quiz_question(db_session, "q1")
    assert q1_after["prompt"] == "Select 2?"
    assert q1_after["options"] == ["C", "D"]

    # Delete question
    deleted = delete_quiz_question(db_session, "q1")
    assert deleted is True
    assert get_quiz_question(db_session, "q1") is None


def test_quiz_progress_controls(db_session: Session):
    """Verifies Upsert, Get, Reset, and Delete on quiz_progress."""
    create_practice_topic(db_session, "t1", "Topic", "SQL", "PostgreSQL", "db", 1)

    # Initial get should be None
    assert get_quiz_progress(db_session, "t1") is None

    # Upsert
    answers = {"0": {"value": 0, "correct": True}}
    upsert_quiz_progress(db_session, "t1", 1, answers, False)

    prog = get_quiz_progress(db_session, "t1")
    assert prog is not None
    assert prog["current_index"] == 1
    assert prog["done"] is False
    assert prog["answers"] == answers

    # Reset
    reset_ok = reset_quiz_progress(db_session, "t1")
    assert reset_ok is True
    prog_reset = get_quiz_progress(db_session, "t1")
    assert prog_reset["current_index"] == 0
    assert prog_reset["done"] is False
    assert prog_reset["answers"] == {}

    # Delete progress
    del_ok = delete_quiz_progress(db_session, "t1")
    assert del_ok is True
    assert get_quiz_progress(db_session, "t1") is None


def test_list_practice_topics_aggregation(db_session: Session):
    """Verifies that list_practice_topics returns total questions and progress states."""
    create_practice_topic(db_session, "t1", "Topic 1", "SQL", "PostgreSQL", "db", 1)
    create_quiz_question(db_session, "q1", "t1", "mcq", "P1", ["A", "B"], "0", None, "E1", 0)
    create_quiz_question(db_session, "q2", "t1", "tf", "P2", None, "true", None, "E2", 1)

    topics = list_practice_topics(db_session)
    assert len(topics) == 1
    assert topics[0]["total_questions"] == 2
    assert topics[0]["answered_count"] == 0
    assert topics[0]["done"] is False

    # Mark 1 answer
    upsert_quiz_progress(db_session, "t1", 1, {"0": {"value": 0, "correct": True}}, False)
    topics_updated = list_practice_topics(db_session)
    assert topics_updated[0]["answered_count"] == 1
    assert topics_updated[0]["done"] is False


def test_study_plans_and_problems_crud(db_session: Session):
    """Verifies CRUD operations on study_plans and coding_problems."""
    create_study_plan(db_session, "sql-50", "SQL 50", "Top SQL Questions", "SQL", "SQL")

    plan = get_study_plan(db_session, "sql-50")
    assert plan is not None
    assert plan["title"] == "SQL 50"
    assert len(plan["problems"]) == 0

    # Create problem
    create_coding_problem(
        db_session,
        id="sql-50:p1",
        plan_id="sql-50",
        title="Recyclable Products",
        order_index=1,
        difficulty="Easy",
        tags=["SQL", "Filter"],
        language="SQL",
        description_md="Description",
        starter_code="SELECT *",
        setup_sql="CREATE TABLE ...",
        canonical_solution="SELECT product_id",
    )

    plan_with_prob = get_study_plan(db_session, "sql-50")
    assert len(plan_with_prob["problems"]) == 1
    assert plan_with_prob["problems"][0]["title"] == "Recyclable Products"
    assert plan_with_prob["problems"][0]["solved"] is False

    prob = get_coding_problem(db_session, "sql-50:p1")
    assert prob is not None
    assert prob["difficulty"] == "Easy"
    assert prob["tags"] == ["SQL", "Filter"]

    # Update problem
    updated = update_coding_problem(
        db_session,
        problem_id="sql-50:p1",
        title="Recyclable Products Updated",
        difficulty="Medium",
        tags=["SQL", "Advanced"],
        description_md="New Desc",
        starter_code="SELECT 1",
        setup_sql=None,
        canonical_solution="SELECT 1",
    )
    assert updated is True
    prob_after = get_coding_problem(db_session, "sql-50:p1")
    assert prob_after["title"] == "Recyclable Products Updated"
    assert prob_after["difficulty"] == "Medium"

    # Update plan
    plan_up = update_study_plan(db_session, "sql-50", "SQL 50 Master", "Subtitle", "SQL", "SQL Pro")
    assert plan_up is True
    plan_after = get_study_plan(db_session, "sql-50")
    assert plan_after["title"] == "SQL 50 Master"

    # Delete problem
    del_p = delete_coding_problem(db_session, "sql-50:p1")
    assert del_p is True
    assert get_coding_problem(db_session, "sql-50:p1") is None

    # Delete plan
    del_plan = delete_study_plan(db_session, "sql-50")
    assert del_plan is True
    assert get_study_plan(db_session, "sql-50") is None


def test_test_cases_crud(db_session: Session):
    """Verifies CRUD operations on test_cases."""
    create_coding_problem(
        db_session,
        id="prob1",
        plan_id=None,
        title="Problem 1",
        order_index=1,
        difficulty="Easy",
        tags=[],
        language="Python",
        description_md="Desc",
        starter_code="pass",
        canonical_solution="pass",
    )

    create_test_case(db_session, "tc1", "prob1", 1, {"nums": [1, 2]}, {"output": 3})
    cases = get_test_cases(db_session, "prob1")
    assert len(cases) == 1
    assert cases[0]["input"] == {"nums": [1, 2]}
    assert cases[0]["expected_output"] == {"output": 3}

    # Update test case
    updated = update_test_case(db_session, "tc1", 1, {"nums": [2, 3]}, {"output": 5})
    assert updated is True
    cases_after = get_test_cases(db_session, "prob1")
    assert cases_after[0]["input"] == {"nums": [2, 3]}

    # Delete test case
    deleted = delete_test_case(db_session, "tc1")
    assert deleted is True
    assert len(get_test_cases(db_session, "prob1")) == 0


def test_submissions_crud(db_session: Session):
    """Verifies recording, listing, and deleting code submissions."""
    create_coding_problem(
        db_session,
        id="prob1",
        plan_id=None,
        title="Problem 1",
        order_index=1,
        difficulty="Easy",
        tags=[],
        language="Python",
        description_md="Desc",
        starter_code="pass",
        canonical_solution="pass",
    )

    sub_id = record_submission(db_session, "prob1", "Python", "Accepted", 42, "def sol(): pass")
    assert sub_id is not None

    subs = list_submissions(db_session, "prob1")
    assert len(subs) == 1
    assert subs[0]["status"] == "Accepted"
    assert subs[0]["runtime_ms"] == 42

    # Delete submission
    del_ok = delete_submission(db_session, sub_id)
    assert del_ok is True
    assert len(list_submissions(db_session, "prob1")) == 0

    # Clear submissions helper
    record_submission(db_session, "prob1", "Python", "Wrong Answer", 10, "code")
    record_submission(db_session, "prob1", "Python", "Accepted", 15, "code")
    assert len(list_submissions(db_session, "prob1")) == 2
    cleared = clear_problem_submissions(db_session, "prob1")
    assert cleared == 2
    assert len(list_submissions(db_session, "prob1")) == 0


def test_seed_db_idempotency(db_session: Session):
    """Verifies that seed_db populates the database and does not duplicate on second execution."""
    res1 = seed_db(db_session)
    assert res1["topics"] == 20
    assert res1["questions"] == 80
    assert res1["plans"] == 5
    assert res1["problems"] == 60
    assert res1["test_cases"] == 4

    res2 = seed_db(db_session)
    assert res2["topics"] == 0
    assert res2["questions"] == 0
    assert res2["plans"] == 0
    assert res2["problems"] == 0
    assert res2["test_cases"] == 0
