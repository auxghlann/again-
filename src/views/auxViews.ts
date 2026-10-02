import { attachShellEvents, renderShell } from '../components/shell';
import { getState } from '../state';

export function renderDashboard(container: HTMLElement): void {
  const plans = getState().studyPlans;
  const topics = getState().practiceTopics;

  const totalProblems = plans.reduce((acc, p) => acc + (p.problemCount ?? p.total_problems ?? 0), 0);
  const totalSolved = plans.reduce((acc, p) => acc + (p.completedCount ?? p.solved_count ?? 0), 0);
  const activePracticeCount = topics.filter(
    (t) =>
      (t.answered_count ?? t.completedCount ?? 0) > 0 &&
      (t.answered_count ?? t.completedCount ?? 0) < (t.total_questions ?? t.totalQuestions ?? 4)
  ).length;

  const contentHtml = `
    <div class="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <h1 class="text-2xl font-bold tracking-tight text-brand-text mb-1">Welcome back, Khester</h1>
      <p class="text-sm text-brand-muted mb-6">Pick up a study plan or try a short practice session.</p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="p-5 rounded-xl bg-brand-surface border border-brand-line flex flex-col gap-1 shadow-xs">
          <b class="text-2xl font-bold text-brand-text">${totalSolved}</b>
          <span class="text-xs text-brand-muted">Problems solved of ${totalProblems || 100}</span>
        </div>
        <div class="p-5 rounded-xl bg-brand-surface border border-brand-line flex flex-col gap-1 shadow-xs">
          <b class="text-2xl font-bold text-brand-text">${plans.length}</b>
          <span class="text-xs text-brand-muted">Curated study plans</span>
        </div>
        <div class="p-5 rounded-xl bg-brand-surface border border-brand-line flex flex-col gap-1 shadow-xs">
          <b class="text-2xl font-bold text-brand-text">${activePracticeCount || topics.length}</b>
          <span class="text-xs text-brand-muted">Practice topic sessions</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <a class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#0e1a2c] dark:bg-white text-white dark:text-[#0e1a2c] hover:opacity-90 transition-opacity" href="#/code">Browse study plans</a>
        <a class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-surface text-brand-text border border-brand-line hover:border-brand-text/30 transition-colors" href="#/practice">Open practice library</a>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('dashboard', contentHtml, ['Home', 'Dashboard']);
  attachShellEvents(container);
}

export function renderActivity(container: HTMLElement): void {
  const contentHtml = `
    <div class="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <h1 class="text-2xl font-bold tracking-tight text-brand-text mb-1">My Activity</h1>
      <p class="text-sm text-brand-muted mb-6">Submissions and practice sessions from your local recall workspace.</p>
      <div class="flex flex-col divide-y divide-brand-line rounded-xl bg-brand-surface border border-brand-line overflow-hidden text-xs">
        <div class="flex items-center justify-between p-4">
          <span class="font-medium text-brand-text">Active database backend</span>
          <span class="font-semibold text-emerald-500">PostgreSQL 16 (localhost:5432)</span>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="font-medium text-brand-text">Execution sandbox</span>
          <span class="font-semibold text-emerald-500">Active (PostgreSQL + Python)</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('activity', contentHtml, ['Home', 'My Activity']);
  attachShellEvents(container);
}

export function renderResources(container: HTMLElement): void {
  const contentHtml = `
    <div class="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <h1 class="text-2xl font-bold tracking-tight text-brand-text mb-1">Resources & Reference</h1>
      <p class="text-sm text-brand-muted mb-6">Curated cheat-sheets and documentation guides.</p>
      <div class="flex flex-col divide-y divide-brand-line rounded-xl bg-brand-surface border border-brand-line overflow-hidden text-xs">
        <div class="flex items-center justify-between p-4">
          <span class="font-medium text-brand-text">Python Standard Library Documentation</span>
          <a class="text-indigo-500 hover:underline font-semibold" href="https://docs.python.org/3/" target="_blank" rel="noopener">docs.python.org</a>
        </div>
        <div class="flex items-center justify-between p-4">
          <span class="font-medium text-brand-text">PostgreSQL 16 Manual</span>
          <a class="text-indigo-500 hover:underline font-semibold" href="https://www.postgresql.org/docs/current/" target="_blank" rel="noopener">postgresql.org</a>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('resources', contentHtml, ['Learn', 'Resources']);
  attachShellEvents(container);
}

export function renderNotFound(container: HTMLElement): void {
  const contentHtml = `
    <div class="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <h1 class="text-2xl font-bold tracking-tight text-brand-text mb-1">That page does not exist</h1>
      <p class="text-sm text-brand-muted mb-6">Use the sidebar navigation to return to Practice or Code.</p>
      <div>
        <a class="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#0e1a2c] dark:bg-white text-white dark:text-[#0e1a2c] hover:opacity-90 transition-opacity" href="#/practice">Back to Practice</a>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('', contentHtml, ['Not Found']);
  attachShellEvents(container);
}
