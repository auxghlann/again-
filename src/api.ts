import type {
  CodingProblemDetailResponse,
  FastApiErrorPayload,
  FastApiValidationError,
  HealthResponse,
  PracticeTopicCard,
  PythonRunRequest,
  PythonRunResponse,
  QuizDetailResponse,
  QuizProgressActionResponse,
  QuizProgressUpsertRequest,
  SqlRunRequest,
  SqlRunResponse,
  StudyPlanDetailResponse,
  StudyPlanSummary,
  SubmissionItem,
} from './types';

export class ApiError extends Error {
  public status: number;
  public data?: FastApiErrorPayload | string | null;

  constructor(message: string, status: number, data?: FastApiErrorPayload | string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: FastApiErrorPayload | null = null;
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;

      try {
        errorData = (await response.json()) as FastApiErrorPayload;
        if (errorData && typeof errorData === 'object' && errorData.detail !== undefined) {
          const detail = errorData.detail;
          if (Array.isArray(detail)) {
            errorMessage = detail
              .map((d: FastApiValidationError) => {
                const loc = Array.isArray(d.loc) ? d.loc.filter((l) => l !== 'body').join('.') : '';
                const msg = typeof d.msg === 'string' ? d.msg : JSON.stringify(d);
                return loc ? `${loc}: ${msg}` : msg;
              })
              .join('; ');
          } else if (typeof detail === 'object' && detail !== null) {
            errorMessage = JSON.stringify(detail);
          } else if (typeof detail === 'string') {
            errorMessage = detail;
          }
        }
      } catch {
        // Response was not JSON
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(message, 0);
  }
}

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/healthz');
}

export async function getPracticeTopics(): Promise<PracticeTopicCard[]> {
  return apiRequest<PracticeTopicCard[]>('/api/practice');
}

export async function getQuizDetail(topicId: string): Promise<QuizDetailResponse> {
  return apiRequest<QuizDetailResponse>(`/api/quiz/${encodeURIComponent(topicId)}`);
}

export async function upsertQuizProgress(
  topicId: string,
  data: QuizProgressUpsertRequest
): Promise<QuizProgressActionResponse> {
  return apiRequest<QuizProgressActionResponse>(`/api/quiz/${encodeURIComponent(topicId)}/progress`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetQuizProgress(topicId: string): Promise<QuizProgressActionResponse> {
  return apiRequest<QuizProgressActionResponse>(`/api/quiz/${encodeURIComponent(topicId)}/reset`, {
    method: 'POST',
  });
}

export async function deleteQuizProgress(topicId: string): Promise<QuizProgressActionResponse> {
  return apiRequest<QuizProgressActionResponse>(`/api/quiz/${encodeURIComponent(topicId)}/progress`, {
    method: 'DELETE',
  });
}

export async function getStudyPlans(): Promise<StudyPlanSummary[]> {
  return apiRequest<StudyPlanSummary[]>('/api/plans');
}

export async function getStudyPlanDetail(planId: string): Promise<StudyPlanDetailResponse> {
  return apiRequest<StudyPlanDetailResponse>(`/api/plans/${encodeURIComponent(planId)}`);
}

export async function getCodingProblemDetail(problemId: string): Promise<CodingProblemDetailResponse> {
  return apiRequest<CodingProblemDetailResponse>(`/api/problems/${encodeURIComponent(problemId)}`);
}

export async function getProblemSubmissions(problemId: string): Promise<SubmissionItem[]> {
  return apiRequest<SubmissionItem[]>(`/api/problems/${encodeURIComponent(problemId)}/submissions`);
}

export async function deleteSubmission(
  submissionId: string
): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(
    `/api/submissions/${encodeURIComponent(submissionId)}`,
    {
      method: 'DELETE',
    }
  );
}

export async function clearProblemSubmissions(
  problemId: string
): Promise<{ status: string; deleted_count: number }> {
  return apiRequest<{ status: string; deleted_count: number }>(
    `/api/problems/${encodeURIComponent(problemId)}/submissions`,
    {
      method: 'DELETE',
    }
  );
}

export async function toggleProblemSolved(
  problemId: string
): Promise<{ status: string; solved: boolean }> {
  return apiRequest<{ status: string; solved: boolean }>(
    `/api/problems/${encodeURIComponent(problemId)}/toggle-solved`,
    {
      method: 'POST',
    }
  );
}

export async function runSql(data: SqlRunRequest): Promise<SqlRunResponse> {
  return apiRequest<SqlRunResponse>('/api/run/sql', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function runPython(data: PythonRunRequest): Promise<PythonRunResponse> {
  return apiRequest<PythonRunResponse>('/api/run/python', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
