import json
import os
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict, List, Optional

HARNESS_TEMPLATE = """
import json
import sys
import time
import traceback
import inspect

# User submission code begins here
{USER_CODE}
# User submission code ends here

def run_all_cases():
    test_cases = {TEST_CASES_JSON}
    total_count = len(test_cases)
    passed_count = 0
    logs = []
    first_error = None
    overall_status = "Accepted" if total_count > 0 else "No Test Cases"

    # Find the target callable
    target_func = None
    if "Solution" in globals() and inspect.isclass(globals()["Solution"]):
        sol_instance = globals()["Solution"]()
        methods = [
            getattr(sol_instance, m)
            for m in dir(sol_instance)
            if not m.startswith("_") and callable(getattr(sol_instance, m))
        ]
        if methods:
            target_func = methods[0]
    
    if target_func is None:
        user_callables = [
            obj for name, obj in globals().items()
            if not name.startswith("_") and callable(obj) and not inspect.isclass(obj)
            and name not in ("run_all_cases", "json", "sys", "time", "traceback", "inspect")
        ]
        if user_callables:
            target_func = user_callables[-1]

    if target_func is None:
        print(json.dumps({{
            "passed": False,
            "status": "Runtime Error",
            "passed_count": 0,
            "total_count": total_count,
            "output": "No solution class or function found.",
            "error": "Missing entrypoint: Define a Solution class or top-level function.",
        }}))
        return

    for idx, tc in enumerate(test_cases):
        inp = tc.get("input", {{}})
        exp = tc.get("expected_output", {{}})
        expected_val = exp.get("output", exp) if isinstance(exp, dict) else exp

        try:
            if isinstance(inp, dict):
                actual_val = target_func(**inp)
            elif isinstance(inp, (list, tuple)):
                actual_val = target_func(*inp)
            else:
                actual_val = target_func(inp)

            if actual_val == expected_val:
                passed_count += 1
                logs.append(f"Case {{idx + 1}}: Passed")
            else:
                logs.append(f"Case {{idx + 1}}: Failed (Expected {{expected_val}}, Got {{actual_val}})")
                if overall_status == "Accepted":
                    overall_status = "Wrong Answer"
        except Exception as e:
            err_msg = str(e) or type(e).__name__
            logs.append(f"Case {{idx + 1}}: Error ({{err_msg}})")
            if overall_status == "Accepted":
                overall_status = "Runtime Error"
            if not first_error:
                first_error = traceback.format_exc()

    passed = (passed_count == total_count and total_count > 0)
    final_status = "Accepted" if passed else (overall_status if overall_status != "Accepted" else "Wrong Answer")
    print(json.dumps({{
        "passed": passed,
        "status": final_status,
        "passed_count": passed_count,
        "total_count": total_count,
        "output": "\\n".join(logs) + ("\\n" if logs else ""),
        "error": first_error,
    }}))

if __name__ == "__main__":
    run_all_cases()
"""


def run_python_sandbox(
    user_code: str,
    test_cases: List[Dict[str, Any]],
    timeout_seconds: float = 5.0,
) -> Dict[str, Any]:
    """Executes Python user code against test cases in an isolated subprocess with a timeout guard."""
    # Write harness to temp file
    harness_code = HARNESS_TEMPLATE.format(
        USER_CODE=user_code,
        TEST_CASES_JSON=json.dumps(test_cases),
    )

    temp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tf:
            tf.write(harness_code)
            temp_path = tf.name

        start_time = time.perf_counter()
        proc = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            encoding="utf-8",
        )
        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        stdout = proc.stdout.strip()
        stderr = proc.stderr.strip()

        if proc.returncode != 0 and not stdout:
            # Syntax error or unhandled top-level exception before harness
            error_line = stderr.splitlines()[-1] if stderr else "Non-zero exit code"
            return {
                "passed": False,
                "status": "Runtime Error",
                "passed_count": 0,
                "total_count": len(test_cases),
                "runtime_ms": max(elapsed_ms, 1),
                "output": stderr or stdout,
                "error": error_line,
            }

        # Parse harness JSON output
        try:
            # Look for JSON on the last line of stdout
            json_line = stdout.splitlines()[-1] if stdout else "{}"
            result = json.loads(json_line)
            result["runtime_ms"] = max(elapsed_ms, 1)
            return result
        except (json.JSONDecodeError, IndexError):
            return {
                "passed": False,
                "status": "Runtime Error",
                "passed_count": 0,
                "total_count": len(test_cases),
                "runtime_ms": max(elapsed_ms, 1),
                "output": stdout or stderr,
                "error": stderr or "Failed to parse test execution output.",
            }

    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "status": "Timeout",
            "passed_count": 0,
            "total_count": len(test_cases),
            "runtime_ms": int(timeout_seconds * 1000),
            "output": f"Execution timed out ({timeout_seconds:.1f}s limit exceeded).",
            "error": "TimeLimitExceeded",
        }
    except Exception as exc:
        return {
            "passed": False,
            "status": "Runtime Error",
            "passed_count": 0,
            "total_count": len(test_cases),
            "runtime_ms": 0,
            "output": "",
            "error": str(exc),
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
