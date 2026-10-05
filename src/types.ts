export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type QuizQuestionType = 'mcq' | 'tf' | 'fib';
export type QuizStatus = 'not_started' | 'in_progress' | 'completed';
export type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Timeout' | 'Compile Error';

// Practice & Quiz Schemas
export interface PracticeTopicCard {
  id: string;
  title: string;
  topic?: string;
  tool?: string;
  icon?: string;
  sort_order?: number;
  total_questions?: number;
  answered_count?: number;
  done?: boolean;
  totalQuestions?: number;
  completedCount?: number;
  status?: QuizStatus;
}

export interface QuizQuestionItem {
  id: string;
  topicId?: string;
  topic_id?: string;
  prompt: string;
  type: QuizQuestionType;
  options: string[] | null;
  correct?: number | boolean | null;
  answer?: string | null;
  explain?: string;
  explanation?: string;
  order_index?: number;
}

export interface QuizProgressState {
  topicId: string;
  completedQuestions: number;
  totalQuestions: number;
  score: number;
  isCompleted: boolean;
  answers: Record<string, string>;
}

export interface QuizCardHeader {
  title: string;
  topic: string;
  tool: string;
  icon: string;
}

export interface QuizDetailResponse {
  card: QuizCardHeader;
  questions: QuizQuestionItem[];
  progress: QuizProgressState | null;
}

export interface QuizProgressUpsertRequest {
  questionIndex: number;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface QuizProgressActionResponse {
  status: string;
  topicId: string;
  completedQuestions: number;
  score: number;
  isCompleted: boolean;
}

// Study Plans & Coding Problems Schemas
export interface StudyPlanSummary {
  id: string;
  title: string;
  description: string;
  category?: string;
  difficulty?: DifficultyLevel;
  problemCount?: number;
  completedCount?: number;
  tags?: string[];
  subtitle?: string;
  language?: string;
  badge_text?: string;
  total_problems?: number;
  solved_count?: number;
}

export interface PlanProblemChecklistItem {
  id: string;
  problemId?: string;
  planId?: string;
  title: string;
  difficulty: DifficultyLevel | string;
  orderIndex?: number;
  order_index?: number;
  tags?: string[];
  language?: string;
  isCompleted?: boolean;
  solved?: boolean;
}

export interface StudyPlanDetailResponse {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  language: string;
  badge_text?: string;
  category?: string;
  problems: PlanProblemChecklistItem[];
  plan?: StudyPlanSummary;
}

export interface TestCaseItem {
  id?: string;
  problemId?: string;
  problem_id?: string;
  case_index?: number;
  input?: Record<string, unknown> | string | unknown;
  inputData?: Record<string, unknown> | string | unknown;
  expected_output?: unknown;
  expectedOutput?: unknown;
  isHidden?: boolean;
  explanation?: string | null;
}

export interface CodingProblemDetailResponse {
  id: string;
  title: string;
  difficulty: DifficultyLevel | string;
  planId?: string | null;
  plan_id?: string | null;
  language: string;
  starterCode?: string;
  starter_code?: string;
  descriptionMarkdown?: string;
  description_md?: string;
  setup_sql?: string | null;
  canonical_solution?: string | null;
  cases?: TestCaseItem[];
  testCases?: TestCaseItem[];
}

export interface SubmissionItem {
  id: string;
  problemId?: string;
  problem_id?: string;
  code?: string;
  submitted_code?: string;
  submittedCode?: string;
  language: string;
  status: SubmissionStatus | string;
  passedCount?: number;
  totalCount?: number;
  executionTimeMs?: number;
  runtime_ms?: number;
  runtimeMs?: number;
  createdAt?: string;
  created_at?: string;
}

// Execution Sandboxes Schemas
export interface SqlRunRequest {
  problemId?: string;
  problem_id?: string;
  userQuery?: string;
  user_sql?: string;
  sql?: string;
  code?: string;
  is_submission?: boolean;
}

export interface SqlRunResponse {
  passed: boolean;
  status: SubmissionStatus;
  columns?: string[];
  rows?: unknown[][];
  expectedColumns?: string[];
  expectedRows?: unknown[][];
  durationMs?: number;
  duration_ms?: number;
  runtime_ms?: number;
  diff?: string | null;
  error?: string | null;
}

export interface PythonRunRequest {
  problemId?: string;
  problem_id?: string;
  code?: string;
  user_code?: string;
  is_submission?: boolean;
}

export interface PythonRunResponse {
  passed: boolean;
  status: SubmissionStatus;
  passedCount?: number;
  passed_count?: number;
  totalCount?: number;
  total_count?: number;
  output: string;
  durationMs?: number;
  duration_ms?: number;
  runtime_ms?: number;
  error?: string | null;
}

// System Health Diagnostics Schema
export interface HealthResponse {
  status: string;
  api?: string;
  db: string;
  postgres: string;
  runner?: string;
  runner_python?: string;
  version: string;
}

// Navigation Breadcrumbs
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
export type BreadcrumbInput = string | BreadcrumbItem;

