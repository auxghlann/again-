from datetime import datetime
from typing import Any, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.database import Base


class PracticeTopic(Base):
    __tablename__ = "practice_topics"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True)
    title: Mapped[str] = mapped_column(sa.String, nullable=False)
    topic: Mapped[str] = mapped_column(sa.String, nullable=False)
    tool: Mapped[str] = mapped_column(sa.String, nullable=False)
    icon: Mapped[str] = mapped_column(sa.String, nullable=False)
    sort_order: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)

    questions: Mapped[List["QuizQuestion"]] = relationship(
        "QuizQuestion",
        back_populates="topic",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="QuizQuestion.order_index",
    )
    progress: Mapped[Optional["QuizProgress"]] = relationship(
        "QuizProgress",
        back_populates="topic",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True)
    topic_id: Mapped[str] = mapped_column(
        sa.String,
        sa.ForeignKey("practice_topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(sa.String, nullable=False)  # 'mcq', 'tf', 'fib'
    prompt: Mapped[str] = mapped_column(sa.Text, nullable=False)
    options_json: Mapped[Optional[Any]] = mapped_column(sa.JSON, nullable=True)
    correct_val: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    canonical_answer: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    explanation: Mapped[str] = mapped_column(sa.Text, nullable=False)
    order_index: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)

    topic: Mapped["PracticeTopic"] = relationship("PracticeTopic", back_populates="questions")

    __table_args__ = (
        sa.CheckConstraint("type IN ('mcq', 'tf', 'fib')", name="check_question_type"),
    )


class QuizProgress(Base):
    __tablename__ = "quiz_progress"

    card_id: Mapped[str] = mapped_column(
        sa.String,
        sa.ForeignKey("practice_topics.id", ondelete="CASCADE"),
        primary_key=True,
    )
    current_index: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    done: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    answers_json: Mapped[Optional[Any]] = mapped_column(sa.JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    topic: Mapped["PracticeTopic"] = relationship("PracticeTopic", back_populates="progress")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True)
    title: Mapped[str] = mapped_column(sa.String, nullable=False)
    subtitle: Mapped[str] = mapped_column(sa.String, nullable=False)
    language: Mapped[str] = mapped_column(sa.String, nullable=False)
    badge_text: Mapped[str] = mapped_column(sa.String, nullable=False)

    problems: Mapped[List["CodingProblem"]] = relationship(
        "CodingProblem",
        back_populates="plan",
        order_by="CodingProblem.order_index",
    )


class CodingProblem(Base):
    __tablename__ = "coding_problems"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True)
    plan_id: Mapped[Optional[str]] = mapped_column(
        sa.String,
        sa.ForeignKey("study_plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(sa.String, nullable=False)
    order_index: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    difficulty: Mapped[str] = mapped_column(sa.String, nullable=False)  # 'Easy', 'Medium', 'Hard'
    tags_json: Mapped[Optional[Any]] = mapped_column(sa.JSON, nullable=True)
    language: Mapped[str] = mapped_column(sa.String, nullable=False)
    description_md: Mapped[str] = mapped_column(sa.Text, nullable=False)
    starter_code: Mapped[str] = mapped_column(sa.Text, nullable=False)
    setup_sql: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    canonical_solution: Mapped[str] = mapped_column(sa.Text, nullable=False)

    plan: Mapped[Optional["StudyPlan"]] = relationship("StudyPlan", back_populates="problems")
    test_cases: Mapped[List["TestCase"]] = relationship(
        "TestCase",
        back_populates="problem",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="TestCase.case_index",
    )
    submissions: Mapped[List["UserCodingSubmission"]] = relationship(
        "UserCodingSubmission",
        back_populates="problem",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="UserCodingSubmission.created_at.desc()",
    )

    __table_args__ = (
        sa.CheckConstraint("difficulty IN ('Easy', 'Medium', 'Hard')", name="check_problem_difficulty"),
    )


class TestCase(Base):
    __tablename__ = "test_cases"
    __test__ = False

    id: Mapped[str] = mapped_column(sa.String, primary_key=True)
    problem_id: Mapped[str] = mapped_column(
        sa.String,
        sa.ForeignKey("coding_problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    case_index: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    input_json: Mapped[Any] = mapped_column(sa.JSON, nullable=False)
    expected_output_json: Mapped[Any] = mapped_column(sa.JSON, nullable=False)

    problem: Mapped["CodingProblem"] = relationship("CodingProblem", back_populates="test_cases")


class UserCodingSubmission(Base):
    __tablename__ = "user_coding_submissions"

    id: Mapped[str] = mapped_column(sa.String, primary_key=True)
    problem_id: Mapped[str] = mapped_column(
        sa.String,
        sa.ForeignKey("coding_problems.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language: Mapped[str] = mapped_column(sa.String, nullable=False)
    status: Mapped[str] = mapped_column(sa.String, nullable=False)
    runtime_ms: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    submitted_code: Mapped[str] = mapped_column(sa.Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime,
        server_default=sa.func.now(),
        nullable=False,
    )

    problem: Mapped["CodingProblem"] = relationship("CodingProblem", back_populates="submissions")

    __table_args__ = (
        sa.CheckConstraint(
            "status IN ('Accepted', 'Wrong Answer', 'Runtime Error', 'Timeout')",
            name="check_submission_status",
        ),
    )
