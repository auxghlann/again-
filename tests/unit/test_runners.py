from unittest.mock import MagicMock, patch
import psycopg2

from backend.runner.postgres import check_postgres_connection, run_sql_sandbox
from backend.runner.python import run_python_sandbox


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
