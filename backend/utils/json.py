import json
from typing import Any


def safe_json_loads(value: Any, default: Any = None) -> Any:
    """Safely deserializes a JSON string, returning default if invalid or None."""
    if value is None:
        return default if default is not None else {}
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default if default is not None else {}


def ensure_json(value: Any) -> Any:
    """Ensures input value is a Python data structure suitable for JSON columns."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    return value
