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
  status?: QuizStatus;
}

export interface QuizQuestionItem {
  id: string;
  topic_id?: string;
  prompt: string;
  type: QuizQuestionType;
  options: string[] | null;
  correct?: number | boolean | null;
  answer?: string | null;
  explain?: string;
  order_index?: number;
}

export type QuizAnswerValue = string | number | boolean | { value: string | number | boolean; correct?: boolean };

export interface QuizProgressState {
  topicId: string;
  completedQuestions: number;
  totalQuestions: number;
  score: number;
  isCompleted: boolean;
  answers: Record<string, QuizAnswerValue>;
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
  tags?: string[];
  subtitle?: string;
  language?: string;
  badge_text?: string;
  total_problems?: number;
  solved_count?: number;
}

export interface PlanProblemChecklistItem {
  id: string;
  title: string;
  difficulty: DifficultyLevel | string;
  order_index?: number;
  tags?: string[];
  language?: string;
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

// Analytical SQL & Tabular Types
export type SqlCellValue = string | number | boolean | null;
export type SqlRow = Record<string, SqlCellValue>;

export interface TableData {
  columns?: string[];
  rows?: (SqlRow | SqlCellValue[])[];
}

export interface TestCaseSqlInput {
  table_name?: string;
  columns?: string[];
  rows?: (SqlRow | SqlCellValue[])[];
  tables?: Record<string, TableData>;
}

export interface TestCaseSqlOutput {
  columns?: string[];
  rows?: SqlRow[];
}

export type TestCaseData =
  | TestCaseSqlInput
  | TestCaseSqlOutput
  | SqlCellValue
  | SqlCellValue[]
  | Record<string, SqlCellValue>;

export interface TestCaseItem {
  id?: string;
  problem_id?: string;
  case_index?: number;
  input?: TestCaseData;
  expected_output?: TestCaseData;
  is_hidden?: boolean;
  explanation?: string | null;
}

export interface CodingProblemDetailResponse {
  id: string;
  title: string;
  difficulty: DifficultyLevel | string;
  plan_id?: string | null;
  language: string;
  starter_code?: string;
  description_md?: string;
  setup_sql?: string | null;
  canonical_solution?: string | null;
  cases?: TestCaseItem[];
}

export interface SubmissionItem {
  id: string;
  problem_id?: string;
  language: string;
  status: SubmissionStatus | string;
  runtime_ms?: number;
  submitted_code?: string;
  created_at?: string;
}

// Execution Sandboxes Schemas
export interface SqlRunRequest {
  problem_id: string;
  user_sql: string;
  is_submission?: boolean;
}

export interface SqlRunResponse {
  passed: boolean;
  status: SubmissionStatus | string;
  columns?: string[];
  rows?: SqlRow[];
  expected_rows?: SqlRow[];
  runtime_ms: number;
  diff?: string | null;
  error?: string | null;
}

export interface PythonRunRequest {
  problem_id: string;
  user_code: string;
  is_submission?: boolean;
}

export interface PythonRunResponse {
  passed: boolean;
  status: SubmissionStatus | string;
  passed_count: number;
  total_count: number;
  runtime_ms: number;
  output: string;
  error?: string | null;
}

// System Health Diagnostics Schema
export interface HealthResponse {
  status: string;
  api?: string;
  db: string;
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

// API Error Payload Types
export interface FastApiValidationError {
  loc: (string | number)[];
  msg: string;
  type?: string;
}

export interface FastApiErrorPayload {
  detail?: string | FastApiValidationError[] | Record<string, string>;
}
