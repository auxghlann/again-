from typing import List
from pydantic import BaseModel, ConfigDict, Field


class StudyPlanSummary(BaseModel):
    """Schema for a study plan track in the catalog list."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    subtitle: str
    language: str
    badge_text: str
    total_problems: int = 0
    solved_count: int = 0


class PlanProblemChecklistItem(BaseModel):
    """Schema for a problem entry inside a study plan's checklist."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    order_index: int = 0
    difficulty: str
    tags: List[str] = Field(default_factory=list)
    language: str
    solved: bool = False


class StudyPlanDetailResponse(BaseModel):
    """Detailed response for a study plan with its full ordered problem list."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    subtitle: str
    language: str
    badge_text: str
    problems: List[PlanProblemChecklistItem] = Field(default_factory=list)
