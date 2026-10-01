from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db.database import get_db_session
from backend.db.queries.plans import list_study_plans
from backend.db.queries.practice import list_practice_topics
from backend.schemas.plans import StudyPlanSummary
from backend.schemas.practice import PracticeTopicCard

router = APIRouter(tags=["catalog"])


@router.get("/practice", response_model=List[PracticeTopicCard])
def get_practice_catalog(db: Session = Depends(get_db_session)) -> List[PracticeTopicCard]:
    """Returns all conceptual practice topic cards with completion metrics."""
    topics = list_practice_topics(db)
    return [PracticeTopicCard.model_validate(t) for t in topics]


@router.get("/plans", response_model=List[StudyPlanSummary])
def get_study_plans_catalog(db: Session = Depends(get_db_session)) -> List[StudyPlanSummary]:
    """Returns all coding study plans with total and solved problem counts."""
    plans = list_study_plans(db)
    return [StudyPlanSummary.model_validate(p) for p in plans]
