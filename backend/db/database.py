from contextlib import contextmanager
from typing import Generator, Optional
import sqlalchemy as sa
from sqlalchemy import create_engine, event, Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

import os

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+psycopg2://postgres:postgres@localhost:5432/again_practice"
)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models."""
    pass


def get_engine(db_url: Optional[str] = None) -> Engine:
    """Creates and configures an engine instance for PostgreSQL."""
    target_url = db_url if db_url is not None else DATABASE_URL

    eng = create_engine(
        target_url,
        echo=False,
        future=True,
    )

    return eng


# Global application engine and session factory
engine = get_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@contextmanager
def get_db(session_factory=None) -> Generator[Session, None, None]:
    """Context manager yielding a transactional Session, committing or rolling back."""
    factory = session_factory if session_factory is not None else SessionLocal
    session: Session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db_session() -> Generator[Session, None, None]:
    """FastAPI route dependency yielding a Session and closing on completion."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_db(target_engine: Optional[Engine] = None) -> None:
    """Initializes all database tables registered with Base."""
    # Ensure all models are registered on Base
    from backend.db import models  # noqa: F401

    eng = target_engine if target_engine is not None else engine
    Base.metadata.create_all(bind=eng)
