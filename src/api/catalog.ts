import { apiRequest } from './client';
import type {
  CodingProblemDetailResponse,
  HealthResponse,
  PracticeTopicCard,
  QuizDetailResponse,
  QuizProgressActionResponse,
  QuizProgressUpsertRequest,
  StudyPlanDetailResponse,
  StudyPlanSummary,
  SubmissionItem,
} from '../types';

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

export async function clearProblemSubmissions(
  problemId: string
): Promise<{ status: string; deletedCount: number }> {
  return apiRequest<{ status: string; deletedCount: number }>(
    `/api/problems/${encodeURIComponent(problemId)}/submissions`,
    {
      method: 'DELETE',
    }
  );
}
