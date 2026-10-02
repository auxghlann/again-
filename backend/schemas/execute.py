from typing import Any, Dict, List, Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class SqlRunRequest(BaseModel):
    """Request payload to execute an analytical SQL query against PostgreSQL."""
    model_config = ConfigDict(populate_by_name=True)

    problem_id: str = Field(validation_alias=AliasChoices("problem_id", "problemId"))
    user_sql: str = Field(min_length=1, validation_alias=AliasChoices("user_sql", "userSql", "userQuery", "code"))
    is_submission: bool = Field(default=False, validation_alias=AliasChoices("is_submission", "isSubmission"))


class SqlRunResponse(BaseModel):
    """Structured result from PostgreSQL transaction evaluation."""
    model_config = ConfigDict(populate_by_name=True)

    passed: bool
    status: str  # 'Accepted', 'Wrong Answer', 'Runtime Error', 'Timeout'
    runtime_ms: int = Field(validation_alias=AliasChoices("runtime_ms", "runtimeMs", "durationMs"))
    duration_ms: Optional[int] = None
    columns: Optional[List[str]] = None
    rows: Optional[List[Dict[str, Any]]] = None
    expected_rows: Optional[List[Dict[str, Any]]] = None
    diff: Optional[str] = None
    error: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.duration_ms is None:
            self.duration_ms = self.runtime_ms


class PythonRunRequest(BaseModel):
    """Request payload to execute Python algorithm solution."""
    model_config = ConfigDict(populate_by_name=True)

    problem_id: str = Field(validation_alias=AliasChoices("problem_id", "problemId"))
    user_code: str = Field(min_length=1, validation_alias=AliasChoices("user_code", "userCode", "code"))
    is_submission: bool = Field(default=False, validation_alias=AliasChoices("is_submission", "isSubmission"))


class PythonRunResponse(BaseModel):
    """Structured result from Python isolated subprocess evaluation."""
    model_config = ConfigDict(populate_by_name=True)

    passed: bool
    status: str  # 'Accepted', 'Wrong Answer', 'Runtime Error', 'Timeout'
    passed_count: int = Field(validation_alias=AliasChoices("passed_count", "passedCount"))
    total_count: int = Field(validation_alias=AliasChoices("total_count", "totalCount"))
    runtime_ms: int = Field(validation_alias=AliasChoices("runtime_ms", "runtimeMs", "durationMs"))
    duration_ms: Optional[int] = None
    output: str
    error: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.duration_ms is None:
            self.duration_ms = self.runtime_ms

