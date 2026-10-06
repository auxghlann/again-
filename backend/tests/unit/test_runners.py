from datetime import date, datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch

import psycopg2

from backend.runner.postgres import (
    _normalize_cell,
    check_postgres_connection,
    run_sql_sandbox,
)
from backend.runner.python import run_python_sandbox


def test_normalize_cell_collapses_temporal_types_to_iso():
    """DATE/DATETIME columns must compare equal to the ISO strings stored in fixtures."""
    assert _normalize_cell(date(2025, 1, 2)) == "2025-01-02"
    assert _normalize_cell(datetime(2025, 1, 2, 3, 4, 5)) == "2025-01-02T03:04:05"
    # A string that is already ISO must stay byte-identical to the date rendering.
    assert _normalize_cell("2025-01-02") == "2025-01-02"


def test_normalize_cell_still_rounds_numbers_and_trims_strings():
    assert _normalize_cell(Decimal("55.00")) == 55.0
    assert _normalize_cell(3) == 3.0
    assert _normalize_cell("  Alice Park  ") == "Alice Park"
    assert _normalize_cell(None) is None


def test_python_runner_success():
    code = """
class Solution:
    def add(self, a, b):
        return a + b
"""
    test_cases = [
        {"input": {"a": 1, "b": 2}, "expected_output": 3},
        {"input": {"a": -1, "b": 1}, "expected_output": 0},
    ]
    result = run_python_sandbox(code, test_cases, timeout_seconds=2.0)
    assert result["passed"] is True
    assert result["status"] == "Accepted"
    assert result["passed_count"] == 2
    assert result["total_count"] == 2


def test_python_runner_wrong_answer():
    code = """
class Solution:
    def add(self, a, b):
        return a - b
"""
    test_cases = [
        {"input": {"a": 1, "b": 2}, "expected_output": 3},
    ]
    result = run_python_sandbox(code, test_cases, timeout_seconds=2.0)
    assert result["passed"] is False
    assert result["status"] == "Wrong Answer"
    assert result["passed_count"] == 0
    assert result["total_count"] == 1


def test_python_runner_syntax_error():
    code = "def broken(:"
    result = run_python_sandbox(code, [], timeout_seconds=2.0)
    assert result["passed"] is False
    assert result["status"] == "Runtime Error"
    assert "SyntaxError" in result.get("error", "") or "invalid syntax" in result.get("output", "")


def test_python_runner_timeout_guard():
    code = """
class Solution:
    def infinite(self, x):
        while True:
            pass
"""
    test_cases = [{"input": {"x": 1}, "expected_output": 1}]
    result = run_python_sandbox(code, test_cases, timeout_seconds=0.5)
    assert result["passed"] is False
    assert result["status"] == "Timeout"
    assert result["error"] == "TimeLimitExceeded"
    assert "limit exceeded" in result["output"]


def test_python_runner_missing_entrypoint():
    code = "x = 42"
    result = run_python_sandbox(code, [{"input": 1, "expected_output": 1}], timeout_seconds=2.0)
    assert result["passed"] is False
    assert result["status"] == "Runtime Error"
    assert "Missing entrypoint" in result.get("error", "")


def test_postgres_runner_unreachable_target():
    with patch("psycopg2.connect", side_effect=psycopg2.OperationalError("Connection refused")):
        res = run_sql_sandbox("SELECT 1;")
        assert res["passed"] is False
        assert res["status"] == "Runtime Error"
        assert "PostgreSQL target is unreachable" in res["error"]

    with patch("psycopg2.connect", side_effect=psycopg2.OperationalError("Connection refused")):
        assert check_postgres_connection() is False


def test_postgres_runner_rollback_guarantee_on_success():
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    mock_cur.description = [("val",)]
    mock_cur.fetchall.return_value = [{"val": 1}]

    with patch("psycopg2.connect", return_value=mock_conn):
        res = run_sql_sandbox(
            user_sql="SELECT 1 as val;",
            expected_rows=[{"val": 1}],
        )
        assert res["passed"] is True
        assert res["status"] == "Accepted"
        assert res["rows"] == [{"val": 1}]
        # Strict isolation: rollback must be called
        mock_conn.rollback.assert_called_once()
        mock_cur.close.assert_called_once()
        mock_conn.close.assert_called_once()


def test_postgres_runner_rollback_guarantee_on_query_error():
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_cur.execute.side_effect = psycopg2.ProgrammingError("relation 'missing' does not exist")
    mock_conn.cursor.return_value = mock_cur

    with patch("psycopg2.connect", return_value=mock_conn):
        res = run_sql_sandbox("SELECT * FROM missing;")
        assert res["passed"] is False
        assert res["status"] == "Runtime Error"
        assert "does not exist" in res["error"]
        mock_conn.rollback.assert_called_once()
        mock_cur.close.assert_called_once()
        mock_conn.close.assert_called_once()


def test_python_runner_zero_division_error():
    """Verifies runtime exceptions like ZeroDivisionError are caught cleanly without crashing host."""
    code = """
class Solution:
    def calc(self, n):
        return 10 // n
"""
    test_cases = [{"input": {"n": 0}, "expected_output": 1}]
    result = run_python_sandbox(code, test_cases, timeout_seconds=2.0)
    assert result["passed"] is False
    assert result["status"] == "Runtime Error"
    assert "division by zero" in result["output"] or "ZeroDivisionError" in result.get("error", "")


def test_python_runner_recursion_error():
    """Verifies deep recursion errors are captured cleanly as Runtime Error."""
    code = """
class Solution:
    def recurse(self, x):
        return self.recurse(x + 1)
"""
    test_cases = [{"input": {"x": 1}, "expected_output": 1}]
    result = run_python_sandbox(code, test_cases, timeout_seconds=2.0)
    assert result["passed"] is False
    assert result["status"] == "Runtime Error"
    assert "maximum recursion depth exceeded" in result.get("error", "") or "RecursionError" in result.get("output", "")


def test_python_runner_positional_list_input():
    """Verifies positional input lists unpack correctly into multi-argument methods."""
    code = """
class Solution:
    def multiply(self, a, b, c):
        return a * b * c
"""
    test_cases = [{"input": [2, 3, 4], "expected_output": 24}]
    result = run_python_sandbox(code, test_cases, timeout_seconds=2.0)
    assert result["passed"] is True
    assert result["status"] == "Accepted"
    assert result["passed_count"] == 1

