import { getStudyPlans } from '../api';
import { attachShellEvents, renderShell } from '../components/shell';
import { escapeHtml, icon } from '../components/icons';
import { getState, setState } from '../state';
import type { StudyPlanSummary } from '../types';

const CODE_LANG_CHIPS = ['All', 'SQL', 'Python', 'PySpark'];

let activeLangChip = 'All';
let codeSearchQuery = '';

export async function renderCodeCatalog(container: HTMLElement): Promise<void> {
  let plans: StudyPlanSummary[] = getState().studyPlans;

  // Render initial loading state if plans not yet cached
  if (!plans.length) {
    container.innerHTML = renderShell(
      'code',
      `
        <div class="page">
          <div class="empty">Loading study plans...</div>
        </div>
      `,
      ['Code Library', 'All Study Plans']
    );
    attachShellEvents(container);

    try {
      plans = await getStudyPlans();
      setState({ studyPlans: plans });
    } catch {
      // Keep empty or show error
    }
  }

  function filterPlans(): StudyPlanSummary[] {
    const q = codeSearchQuery.trim().toLowerCase();
    return plans.filter((p) => {
      const matchesLang = activeLangChip === 'All' || p.category === activeLangChip;
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchesLang && matchesSearch;
    });
  }

  function renderView(): void {
    const filtered = filterPlans();
    const countText = `${filtered.length} Study plan${filtered.length === 1 ? '' : 's'}`;

    const chipsHtml = CODE_LANG_CHIPS.map(
      (c) => `<button type="button" class="chip ${c === activeLangChip ? 'on' : ''}" data-chip="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    ).join('');

    const optionsHtml = CODE_LANG_CHIPS.map(
      (c) => `<option ${c === activeLangChip ? 'selected' : ''}>${escapeHtml(c)}</option>`
    ).join('');

    const cardsHtml = filtered.length
      ? filtered
          .map((plan) => {
            const isCompleted = plan.problemCount > 0 && plan.completedCount >= plan.problemCount;
            const isInProgress = !isCompleted && plan.completedCount > 0;
            const stateLabel = isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'STUDY PLAN';
            const btnLabel = isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start';
            const percent = plan.problemCount > 0 ? Math.round((plan.completedCount / plan.problemCount) * 100) : 0;
            const langIcon = plan.category === 'SQL' ? 'db' : 'brackets';

            return `
              <a class="card ${isInProgress ? 'ip' : ''}" href="#/plans/${encodeURIComponent(plan.id)}">
                <div class="c-label ${isCompleted || isInProgress ? 'g' : ''}">${stateLabel}</div>
                <h3>${escapeHtml(plan.title)}</h3>
                <div class="bar" title="${plan.completedCount} of ${plan.problemCount} solved">
                  <i style="width: ${percent}%;"></i>
                </div>
                <div class="c-foot">
                  <span class="tool">
                    ${icon(langIcon, 13)}
                    ${escapeHtml(plan.category)} &middot; ${plan.completedCount}/${plan.problemCount}
                  </span>
                  <span class="btn ${isInProgress ? 'dark' : ''}">${btnLabel}</span>
                </div>
              </a>
            `;
          })
          .join('')
      : `<div class="empty">Nothing matches that search. Clear the search or pick another filter.</div>`;

    const contentHtml = `
      <div class="page">
        <div class="chips" id="code-chips">${chipsHtml}</div>
        <div class="tools">
          <div class="count" id="code-count">${countText}</div>
          <div class="tools-r">
            <label class="search">
              ${icon('search', 14)}
              <input id="code-search" type="search" placeholder="Search study plans..." value="${escapeHtml(codeSearchQuery)}" aria-label="Search study plans">
            </label>
            <label class="sel">
              <span>Language:</span>
              <select id="code-sel" aria-label="Filter language">${optionsHtml}</select>
            </label>
          </div>
        </div>
        <div class="grid" id="code-grid">${cardsHtml}</div>
      </div>
    `;

    container.innerHTML = renderShell('code', contentHtml, ['Code Library', 'All Study Plans']);
    attachShellEvents(container);

    // Event attachments
    const chipsContainer = container.querySelector('#code-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-chip]') as HTMLButtonElement | null;
        if (btn) {
          activeLangChip = btn.dataset.chip || 'All';
          renderView();
        }
      });
    }

    const sel = container.querySelector('#code-sel') as HTMLSelectElement | null;
    if (sel) {
      sel.onchange = () => {
        activeLangChip = sel.value;
        renderView();
      };
    }

    const searchInput = container.querySelector('#code-search') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.oninput = () => {
        codeSearchQuery = searchInput.value;
        renderView();
        // Restore focus
        const nextInp = container.querySelector('#code-search') as HTMLInputElement | null;
        if (nextInp) {
          nextInp.focus();
          nextInp.setSelectionRange(nextInp.value.length, nextInp.value.length);
        }
      };
    }
  }

  renderView();
}
