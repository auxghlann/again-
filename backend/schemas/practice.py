from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class PracticeTopicCard(BaseModel):
    """Schema for a practice topic card in the catalog grid."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    topic: str
    tool: str
    icon: str
    sort_order: int = 0
    total_questions: int = 0
    answered_count: int = 0
    done: bool = False


class QuizQuestionItem(BaseModel):
    """Schema for a single conceptual question (MCQ, True/False, or FIB)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str  # 'mcq', 'tf', 'fib'
    prompt: str
    options: Optional[List[str]] = None
    correct: Optional[Union[int, bool]] = None
    answer: Optional[str] = None
    explain: str
    order_index: int = 0


class QuizProgressState(BaseModel):
    """Schema for active user progress on a quiz card."""
    model_config = ConfigDict(from_attributes=True)

    card_id: Optional[str] = None
    current_index: int = 0
    done: bool = False
    answers: Dict[str, Any] = Field(default_factory=dict)
    updated_at: Optional[str] = None


class QuizCardHeader(BaseModel):
    """Summary header metadata for a quiz card view."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    topic: str
    tool: str
    icon: str


class QuizDetailResponse(BaseModel):
    """Full quiz response payload including card header, question bank, and saved progress."""
    model_config = ConfigDict(from_attributes=True)

    card: QuizCardHeader
    questions: List[QuizQuestionItem]
    progress: Optional[QuizProgressState] = None


class QuizProgressUpsertRequest(BaseModel):
    """Request payload to persist user answers and active question index."""
    current_index: int = Field(ge=0)
    answers: Dict[str, Any] = Field(default_factory=dict)
    done: bool = False


class QuizProgressActionResponse(BaseModel):
    """Standard acknowledgment response for progress operations."""
    status: str = "ok"
    updated_at: Optional[str] = None
