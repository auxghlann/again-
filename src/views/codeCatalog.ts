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
        <div class="page p-6 w-full animate-pulse">
          <div class="flex items-center gap-2 mb-5">
            <div class="h-6 w-16 bg-brand-line/60 rounded-full"></div>
            <div class="h-6 w-16 bg-brand-line/40 rounded-full"></div>
            <div class="h-6 w-16 bg-brand-line/40 rounded-full"></div>
          </div>
          <div class="flex items-center justify-between mb-5">
            <div class="h-4 w-32 bg-brand-line/60 rounded"></div>
            <div class="h-8 w-44 bg-brand-line/40 rounded-lg"></div>
          </div>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
            ${Array.from({ length: 6 })
              .map(
                () => `
              <div class="bg-brand-surface border border-brand-line rounded-xl p-5 min-h-[140px] flex flex-col justify-between">
                <div>
                  <div class="h-3 w-20 bg-brand-line/60 rounded mb-3"></div>
                  <div class="h-5 w-3/4 bg-brand-line rounded mb-3"></div>
                  <div class="h-1.5 w-full bg-brand-line/40 rounded-full"></div>
                </div>
                <div class="flex items-center justify-between pt-4 mt-auto">
                  <div class="h-3 w-24 bg-brand-line/50 rounded"></div>
                  <div class="h-6 w-16 bg-brand-line/60 rounded-md"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
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
  } else {
    // Revalidate in background to keep metrics in sync with backend database
    getStudyPlans()
      .then((updated) => {
        plans = updated;
        setState({ studyPlans: updated });
        renderView();
      })
      .catch(() => {});
  }

  function filterPlans(): StudyPlanSummary[] {
    const q = codeSearchQuery.trim().toLowerCase();
    return plans.filter((p) => {
      const planCat = p.category || p.language || 'SQL';
      const matchesLang = activeLangChip === 'All' || planCat.toLowerCase() === activeLangChip.toLowerCase();
      const tags = p.tags || [];
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        tags.some((t) => t.toLowerCase().includes(q));
      return matchesLang && matchesSearch;
    });
  }

  function renderView(): void {
    const filtered = filterPlans();
    const countText = `${filtered.length} Study plan${filtered.length === 1 ? '' : 's'}`;

    const chipsHtml = CODE_LANG_CHIPS.map(
      (c) => {
        const isActive = c === activeLangChip;
        const chipClasses = isActive
          ? 'bg-[#0e1a2c] text-white dark:bg-white dark:text-[#0e1a2c]'
          : 'bg-brand-line/60 text-brand-muted hover:text-brand-text hover:bg-brand-line';
        return `<button type="button" class="chip text-[11px] font-medium px-3 py-1 rounded-full transition-colors ${chipClasses} ${isActive ? 'on' : ''}" data-chip="${escapeHtml(c)}">${escapeHtml(c)}</button>`;
      }
    ).join('');

    const optionsHtml = CODE_LANG_CHIPS.map(
      (c) => `<option ${c === activeLangChip ? 'selected' : ''}>${escapeHtml(c)}</option>`
    ).join('');

    const cardsHtml = filtered.length
      ? filtered
          .map((plan) => {
            const totalCount = plan.problemCount ?? plan.total_problems ?? 0;
            const solvedCount = plan.completedCount ?? plan.solved_count ?? 0;
            const category = plan.category || plan.language || 'SQL';
            const isCompleted = totalCount > 0 && solvedCount >= totalCount;
            const isInProgress = !isCompleted && solvedCount > 0;
            const stateLabel = isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : (plan.badge_text || 'STUDY PLAN');
            const btnLabel = isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start';
            const percent = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;
            const langIcon = category.toLowerCase().includes('sql') ? 'db' : 'brackets';

            const cardBorder = isInProgress ? 'border-brand-text shadow-xs' : 'border-brand-line hover:border-brand-muted/60';
            const labelColor = isCompleted || isInProgress ? 'text-emerald-500' : 'text-brand-muted';
            const btnClasses = isInProgress
              ? 'bg-brand-text text-brand-surface border-brand-text'
              : 'bg-brand-surface border-brand-line text-brand-text hover:bg-brand-surface2';

            return `
              <a class="card flex flex-col bg-brand-surface border rounded-xl p-5 min-h-[130px] transition-all ${cardBorder} ${isInProgress ? 'ip' : ''}" href="#/plans/${encodeURIComponent(plan.id)}">
                <div class="c-label text-[10px] font-semibold tracking-wider ${labelColor} ${isCompleted || isInProgress ? 'g' : ''}">${stateLabel}</div>
                <h3 class="mt-2 font-bold text-[15px] leading-snug tracking-tight text-brand-text">${escapeHtml(plan.title)}</h3>
                <div class="bar h-1 bg-brand-line rounded-full mt-3 overflow-hidden" title="${solvedCount} of ${totalCount} solved">
                  <i class="block h-full bg-emerald-500 transition-all duration-300" style="width: ${percent}%;"></i>
                </div>
                <div class="c-foot mt-auto pt-3.5 flex items-center justify-between text-xs text-brand-muted">
                  <span class="tool flex items-center gap-1.5">
                    ${icon(langIcon, 13)}
                    ${escapeHtml(category)} &middot; ${solvedCount}/${totalCount}
                  </span>
                  <span class="btn inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md border transition-colors ${btnClasses} ${isInProgress ? 'dark' : ''}">${btnLabel}</span>
                </div>
              </a>
            `;
          })
          .join('')
      : `<div class="empty col-span-full w-full p-10 text-center text-sm text-brand-muted bg-brand-surface border border-dashed border-brand-line rounded-xl my-2">Nothing matches that search. Clear the search or pick another filter.</div>`;

    const contentHtml = `
      <div class="page p-6 w-full">
        <div class="chips flex flex-wrap gap-2" id="code-chips">${chipsHtml}</div>
        <div class="tools flex items-center justify-between gap-3 flex-wrap my-5">
          <div class="count text-xs font-semibold text-brand-text" id="code-count">${countText}</div>
          <div class="tools-r flex items-center gap-2.5 flex-wrap">
            <label class="search flex items-center gap-2 bg-brand-surface border border-brand-line rounded-lg px-2.5 h-8 text-xs text-brand-muted focus-within:border-brand-text/50">
              ${icon('search', 14)}
              <input id="code-search" class="bg-transparent border-0 outline-none w-44 text-xs text-brand-text placeholder:text-brand-muted" type="search" placeholder="Search study plans..." value="${escapeHtml(codeSearchQuery)}" aria-label="Search study plans">
            </label>
            <label class="sel flex items-center gap-1.5 bg-brand-surface border border-brand-line rounded-lg px-2.5 h-8 text-xs text-brand-muted">
              <span>Language:</span>
              <select id="code-sel" class="bg-transparent border-0 outline-none text-xs font-semibold text-brand-text cursor-pointer pr-1" aria-label="Filter language">${optionsHtml}</select>
            </label>
          </div>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5" id="code-grid">${cardsHtml}</div>
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
