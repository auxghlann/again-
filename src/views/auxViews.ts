import { attachShellEvents, renderShell } from '../components/shell';
import { getState } from '../state';

export function renderDashboard(container: HTMLElement): void {
  const plans = getState().studyPlans;
  const topics = getState().practiceTopics;

  const totalProblems = plans.reduce((acc, p) => acc + p.problemCount, 0);
  const totalSolved = plans.reduce((acc, p) => acc + p.completedCount, 0);
  const activePracticeCount = topics.filter(
    (t) =>
      (t.answered_count ?? t.completedCount ?? 0) > 0 &&
      (t.answered_count ?? t.completedCount ?? 0) < (t.total_questions ?? t.totalQuestions ?? 4)
  ).length;

  const contentHtml = `
    <div class="page">
      <h1 class="pg">Welcome back, Khester</h1>
      <p class="sub">Pick up a study plan or try a short practice session.</p>

      <div class="stats">
        <div class="stat">
          <b>${totalSolved}</b>
          <span>Problems solved of ${totalProblems || 100}</span>
        </div>
        <div class="stat">
          <b>${plans.length}</b>
          <span>Curated study plans</span>
        </div>
        <div class="stat">
          <b>${activePracticeCount || topics.length}</b>
          <span>Practice topic sessions</span>
        </div>
      </div>

      <div class="tools" style="margin-top: 24px;">
        <a class="btn dark lg" href="#/code">Browse study plans</a>
        <a class="btn lg" href="#/practice">Open practice library</a>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('dashboard', contentHtml, ['Home', 'Dashboard']);
  attachShellEvents(container);
}

export function renderActivity(container: HTMLElement): void {
  const contentHtml = `
    <div class="page">
      <h1 class="pg">My Activity</h1>
      <p class="sub">Submissions and practice sessions from your local recall workspace.</p>
      <div class="list" style="margin-top: 18px;">
        <div>
          <span>Local SQLite database</span>
          <span class="ok-t">data/again.db</span>
        </div>
        <div>
          <span>Execution sandbox</span>
          <span class="ok-t">Active (PostgreSQL + Python)</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('activity', contentHtml, ['Home', 'My Activity']);
  attachShellEvents(container);
}

export function renderResources(container: HTMLElement): void {
  const contentHtml = `
    <div class="page">
      <h1 class="pg">Resources & Reference</h1>
      <p class="sub">Curated cheat-sheets and documentation guides.</p>
      <div class="list" style="margin-top: 18px;">
        <div>
          <span>Python Standard Library Documentation</span>
          <a class="link" href="https://docs.python.org/3/" target="_blank" rel="noopener">docs.python.org</a>
        </div>
        <div>
          <span>PostgreSQL 16 Manual</span>
          <a class="link" href="https://www.postgresql.org/docs/current/" target="_blank" rel="noopener">postgresql.org</a>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('resources', contentHtml, ['Learn', 'Resources']);
  attachShellEvents(container);
}

export function renderNotFound(container: HTMLElement): void {
  const contentHtml = `
    <div class="page">
      <h1 class="pg">That page does not exist</h1>
      <p class="sub">Use the sidebar navigation to return to Practice or Code.</p>
      <div style="margin-top: 18px;">
        <a class="btn dark lg" href="#/practice">Back to Practice</a>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('', contentHtml, ['Not Found']);
  attachShellEvents(container);
}
