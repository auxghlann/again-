import type {
  CodingProblemDetailResponse,
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
