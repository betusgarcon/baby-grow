"""Database session helpers.

Provides both a FastAPI dependency (`get_db`) and a synchronous context manager
(`db_session`) used by ingestion scripts, tests, and the ReAct agent.

Lifespan:
    Stable. If moving to async SQLAlchemy, this module would be the first to change.
"""

from contextlib import contextmanager

from sqlalchemy.orm import Session

from app.models import get_session_factory

# Session factory created once and reused by both helpers below.
SessionLocal = get_session_factory()


def get_db() -> Session:
    """FastAPI dependency that yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session():
    """Synchronous context manager for DB sessions.

    Commits on clean exit, rolls back on any exception, and always closes the
    session. Used by non-FastAPI callers such as knowledge ingestion and tests.
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
