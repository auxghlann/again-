import type {
  CodingProblemDetailResponse,
  HealthResponse,
  PracticeTopicCard,
  QuizDetailResponse,
  StudyPlanDetailResponse,
  StudyPlanSummary,
} from './types';

export type Theme = 'light' | 'dark';

export interface AppState {
  theme: Theme;
  sidebarCollapsed: boolean;
  activeRoute: string;
  routeParams: Record<string, string>;
  backendConnected: boolean;
  healthData: HealthResponse | null;
  practiceTopics: PracticeTopicCard[];
  studyPlans: StudyPlanSummary[];
  activeQuiz: QuizDetailResponse | null;
  activePlan: StudyPlanDetailResponse | null;
  activeProblem: CodingProblemDetailResponse | null;
}

const THEME_STORAGE_KEY = 'again_theme';
const SIDEBAR_STORAGE_KEY = 'again_sidebar_collapsed';

function detectInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function detectInitialSidebarCollapsed(): boolean {
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
}

function applyThemeToDOM(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

const state: AppState = {
  theme: detectInitialTheme(),
  sidebarCollapsed: detectInitialSidebarCollapsed(),
  activeRoute: 'practice',
  routeParams: {},
  backendConnected: false,
  healthData: null,
  practiceTopics: [],
  studyPlans: [],
  activeQuiz: null,
  activePlan: null,
  activeProblem: null,
};

// Initial DOM theme attribute synchronization
applyThemeToDOM(state.theme);

type StateListener = (state: AppState) => void;
const listeners = new Set<StateListener>();

export function getState(): AppState {
  return state;
}

export function setState(partial: Partial<AppState>): void {
  let changed = false;
  const stateRecord = state as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(partial)) {
    if (stateRecord[key] !== value) {
      stateRecord[key] = value;
      changed = true;
    }
  }

  if (changed) {
    notifyListeners();
  }
}

export function subscribe(listener: StateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      console.error('Error in state listener:', err);
    }
  }
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeToDOM(theme);
  setState({ theme });
}

export function toggleTheme(): void {
  const nextTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
}

export function setSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false');
  setState({ sidebarCollapsed: collapsed });
}

export function toggleSidebar(): void {
  setSidebarCollapsed(!state.sidebarCollapsed);
}

export type PlanFilter = 'all' | 'unsolved' | 'solved' | 'easy' | 'medium' | 'hard';
export type PlanSort = 'default' | 'difficulty-asc' | 'difficulty-desc' | 'title-asc' | 'title-desc' | 'status';

const PLAN_FILTER_KEY_PREFIX = 'again_plan_filter_';
const PLAN_SORT_KEY_PREFIX = 'again_plan_sort_';
const CODE_LANG_KEY = 'again_code_lang_chip';
const CODE_SEARCH_KEY = 'again_code_search';
const PRACTICE_TOPIC_KEY = 'again_practice_topic_chip';
const PRACTICE_SEARCH_KEY = 'again_practice_search';

const VALID_PLAN_FILTERS: PlanFilter[] = ['all', 'unsolved', 'solved', 'easy', 'medium', 'hard'];
const VALID_PLAN_SORTS: PlanSort[] = ['default', 'difficulty-asc', 'difficulty-desc', 'title-asc', 'title-desc', 'status'];

export function getPlanFilter(planId: string): PlanFilter {
  const val = localStorage.getItem(`${PLAN_FILTER_KEY_PREFIX}${planId}`) || localStorage.getItem('again_plan_filter');
  return val && VALID_PLAN_FILTERS.includes(val as PlanFilter) ? (val as PlanFilter) : 'all';
}

export function setPlanFilter(planId: string, filter: PlanFilter): void {
  localStorage.setItem(`${PLAN_FILTER_KEY_PREFIX}${planId}`, filter);
  localStorage.setItem('again_plan_filter', filter);
}

export function getPlanSort(planId: string): PlanSort {
  const val = localStorage.getItem(`${PLAN_SORT_KEY_PREFIX}${planId}`) || localStorage.getItem('again_plan_sort');
  return val && VALID_PLAN_SORTS.includes(val as PlanSort) ? (val as PlanSort) : 'default';
}

export function setPlanSort(planId: string, sort: PlanSort): void {
  localStorage.setItem(`${PLAN_SORT_KEY_PREFIX}${planId}`, sort);
  localStorage.setItem('again_plan_sort', sort);
}

export function getCodeCatalogFilter(): { language: string; search: string } {
  return {
    language: localStorage.getItem(CODE_LANG_KEY) || 'All',
    search: localStorage.getItem(CODE_SEARCH_KEY) || '',
  };
}

export function setCodeCatalogFilter(language: string, search: string): void {
  localStorage.setItem(CODE_LANG_KEY, language);
  localStorage.setItem(CODE_SEARCH_KEY, search);
}

export function getPracticeCatalogFilter(): { topic: string; search: string } {
  return {
    topic: localStorage.getItem(PRACTICE_TOPIC_KEY) || 'All',
    search: localStorage.getItem(PRACTICE_SEARCH_KEY) || '',
  };
}

export function setPracticeCatalogFilter(topic: string, search: string): void {
  localStorage.setItem(PRACTICE_TOPIC_KEY, topic);
  localStorage.setItem(PRACTICE_SEARCH_KEY, search);
}
