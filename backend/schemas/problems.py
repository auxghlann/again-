from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TestCaseItem(BaseModel):
    """Schema for a coding problem test case fixture."""
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    case_index: int
    input: Any
    expected_output: Optional[Any] = None


class CodingProblemDetailResponse(BaseModel):
    """Detailed response for the coding workbench workspace."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    plan_id: Optional[str] = None
    title: str
    order_index: int = 0
    difficulty: str
    tags: List[str] = Field(default_factory=list)
    language: str
    description_md: str
    starter_code: str
    setup_sql: Optional[str] = None
    canonical_solution: Optional[str] = None
    cases: List[TestCaseItem] = Field(default_factory=list)


class SubmissionItem(BaseModel):
    """Schema for a historical code execution submission entry."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    problem_id: str
    language: str
    status: str
    runtime_ms: int
    submitted_code: str
    created_at: str
