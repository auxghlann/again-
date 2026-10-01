"""Queries package re-exporting modular domain query functions."""

from backend.db.queries.plans import (
    create_study_plan,
    delete_study_plan,
    get_study_plan,
    list_study_plans,
    update_study_plan,
)
from backend.db.queries.practice import (
    create_practice_topic,
    create_quiz_question,
    delete_practice_topic,
    delete_quiz_progress,
    delete_quiz_question,
    get_practice_topic,
    get_quiz_progress,
    get_quiz_question,
    get_quiz_questions,
    list_practice_topics,
    reset_quiz_progress,
    update_practice_topic,
    update_quiz_question,
    upsert_quiz_progress,
)
from backend.db.queries.problems import (
    create_coding_problem,
    create_test_case,
    delete_coding_problem,
    delete_test_case,
    get_coding_problem,
    get_test_cases,
    update_coding_problem,
    update_test_case,
)
from backend.db.queries.submissions import (
    clear_problem_submissions,
    delete_submission,
    list_submissions,
    record_submission,
)

__all__ = [
    # Practice
    "create_practice_topic",
    "list_practice_topics",
    "get_practice_topic",
    "update_practice_topic",
    "delete_practice_topic",
    "create_quiz_question",
    "get_quiz_questions",
    "get_quiz_question",
    "update_quiz_question",
    "delete_quiz_question",
    "get_quiz_progress",
    "upsert_quiz_progress",
    "reset_quiz_progress",
    "delete_quiz_progress",
    # Plans
    "create_study_plan",
    "list_study_plans",
    "get_study_plan",
    "update_study_plan",
    "delete_study_plan",
    # Problems & Test Cases
    "create_coding_problem",
    "get_coding_problem",
    "update_coding_problem",
    "delete_coding_problem",
    "create_test_case",
    "get_test_cases",
    "update_test_case",
    "delete_test_case",
    # Submissions
    "record_submission",
    "list_submissions",
    "delete_submission",
    "clear_problem_submissions",
]
