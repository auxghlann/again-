import time
from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

from backend.config import (
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PASSWORD,
    POSTGRES_PORT,
    POSTGRES_USER,
)


def check_postgres_connection() -> bool:
    """Checks if the PostgreSQL execution target is reachable."""
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            connect_timeout=2,
        )
        conn.close()
        return True
    except Exception:
        return False


def run_sql_sandbox(
    user_sql: str,
    setup_sql: Optional[str] = None,
    canonical_sql: Optional[str] = None,
    expected_rows: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Executes SQL in a strict BEGIN ... ROLLBACK transaction and validates results."""
    # 1. Connect to PostgreSQL
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            dbname=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            connect_timeout=3,
        )
    except psycopg2.OperationalError as e:
        return {
            "passed": False,
            "status": "Runtime Error",
            "runtime_ms": 0,
            "columns": None,
            "rows": None,
            "expected_rows": None,
            "diff": None,
            "error": (
                f"PostgreSQL target is unreachable on {POSTGRES_HOST}:{POSTGRES_PORT}. "
                f"Ensure PostgreSQL is running. Details: {e}"
            ),
        }

    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 2. Run Setup SQL if present
        if setup_sql and setup_sql.strip():
            cur.execute(setup_sql)

        # 3. Execute User Query & measure duration
        start_time = time.perf_counter()
        cur.execute(user_sql)
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        # Retrieve columns & rows if query returns data
        user_rows: List[Dict[str, Any]] = []
        user_cols: List[str] = []
        if cur.description:
            user_cols = [desc[0] for desc in cur.description]
            fetched = cur.fetchall()
            user_rows = [dict(row) for row in fetched]

        # 4. Determine Expected Output
        exp_rows = expected_rows
        if not exp_rows and canonical_sql and canonical_sql.strip():
            cur.execute(canonical_sql)
            if cur.description:
                exp_rows = [dict(r) for r in cur.fetchall()]

        # 5. Evaluate Correctness
        if exp_rows is not None:
            # Normalize for comparison
            normalized_user = [
                {str(k).lower(): v for k, v in row.items()} for row in user_rows
            ]
            normalized_exp = [
                {str(k).lower(): v for k, v in row.items()} for row in exp_rows
            ]

            if len(normalized_user) != len(normalized_exp):
                passed = False
                status = "Wrong Answer"
                diff = (
                    f"Row count mismatch: expected {len(normalized_exp)} rows, "
                    f"got {len(normalized_user)} rows."
                )
            elif normalized_user != normalized_exp:
                passed = False
                status = "Wrong Answer"
                diff = "Row values mismatch between user output and expected dataset."
            else:
                passed = True
                status = "Accepted"
                diff = None
        else:
            # When no expected fixture exists, running without error counts as valid execution
            passed = True
            status = "Accepted"
            diff = None

        return {
            "passed": passed,
            "status": status,
            "runtime_ms": max(elapsed_ms, 1),
            "columns": user_cols,
            "rows": user_rows,
            "expected_rows": exp_rows,
            "diff": diff,
            "error": None,
        }

    except psycopg2.Error as err:
        return {
            "passed": False,
            "status": "Runtime Error",
            "runtime_ms": 0,
            "columns": None,
            "rows": None,
            "expected_rows": expected_rows,
            "diff": None,
            "error": str(err).strip(),
        }
    except Exception as exc:
        return {
            "passed": False,
            "status": "Runtime Error",
            "runtime_ms": 0,
            "columns": None,
            "rows": None,
            "expected_rows": expected_rows,
            "diff": None,
            "error": str(exc).strip(),
        }
    finally:
        # Always rollback changes to guarantee execution isolation
        try:
            conn.rollback()
            cur.close()
            conn.close()
        except Exception:
            pass
