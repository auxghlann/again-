import { getPracticeTopics } from '../api';
import { attachShellEvents, renderShell } from '../components/shell';
import { escapeHtml, icon } from '../components/icons';
import { getState, setState } from '../state';
import type { PracticeTopicCard } from '../types';

const PRACTICE_TOPIC_CHIPS = [
  'All',
  'Python',
  'SQL',
  'R',
  'Power BI',
  'Tableau',
  'Excel',
  'AWS',
  'Azure',
  'Snowflake',
  'Java',
  'Docker',
  'Git',
  'Theory',
];

const TOPIC_ICONS: Record<string, string> = {
  snowflake: 'snow',
  theory: 'book',
  python: 'brackets',
  sql: 'db',
  'power bi': 'chart',
  tableau: 'chart',
  excel: 'table',
  aws: 'cloud',
  azure: 'cloud',
  java: 'cup',
  docker: 'box',
  git: 'git',
  r: 'chart',
};

function getTopicIcon(title: string): string {
  const lower = title.toLowerCase();
  for (const [key, ic] of Object.entries(TOPIC_ICONS)) {
    if (lower.includes(key)) {
      return ic;
    }
  }
  return 'book';
}

function deriveTopicCategory(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('python') || lower.includes('pandas')) return 'Python';
  if (lower.includes('sql') || lower.includes('database') || lower.includes('joins')) return 'SQL';
  if (lower.includes('snowflake')) return 'Snowflake';
  if (lower.includes('power bi')) return 'Power BI';
  if (lower.includes('tableau')) return 'Tableau';
  if (lower.includes('excel')) return 'Excel';
  if (lower.includes('aws') || lower.includes('s3')) return 'AWS';
  if (lower.includes('azure')) return 'Azure';
  if (lower.includes('java')) return 'Java';
  if (lower.includes('docker')) return 'Docker';
  if (lower.includes('git')) return 'Git';
  if (lower.includes(' r') || lower.startsWith('r ') || lower.includes('in r')) return 'R';
  return 'Theory';
}

let activeFilterChip = 'All';
let searchQuery = '';

export async function renderPracticeCatalog(container: HTMLElement): Promise<void> {
  let topics: PracticeTopicCard[] = getState().practiceTopics;

  // Render initial skeleton if topics not yet fetched
  if (!topics.length) {
    container.innerHTML = renderShell(
      'practice',
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
      ['Practice Library', 'All Topics']
    );
    attachShellEvents(container);

    try {
      topics = await getPracticeTopics();
      setState({ practiceTopics: topics });
    } catch {
      // Keep empty or show error
    }
  }

  function filterTopics(): PracticeTopicCard[] {
    const q = searchQuery.trim().toLowerCase();
    return topics.filter((t) => {
      const category = deriveTopicCategory(t.title);
      const matchesCategory = activeFilterChip === 'All' || category === activeFilterChip;
      const matchesSearch = !q || t.title.toLowerCase().includes(q) || category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }

  function renderView(): void {
    const filtered = filterTopics();
    const countText = `${filtered.length} Practice session${filtered.length === 1 ? '' : 's'}`;

    const chipsHtml = PRACTICE_TOPIC_CHIPS.map(
      (c) => {
        const isActive = c === activeFilterChip;
        const chipClasses = isActive
          ? 'bg-[#0e1a2c] text-white dark:bg-white dark:text-[#0e1a2c]'
          : 'bg-brand-line/60 text-brand-muted hover:text-brand-text hover:bg-brand-line';
        return `<button type="button" class="chip text-[11px] font-medium px-3 py-1 rounded-full transition-colors ${chipClasses} ${isActive ? 'on' : ''}" data-chip="${escapeHtml(c)}">${escapeHtml(c)}</button>`;
      }
    ).join('');

    const optionsHtml = PRACTICE_TOPIC_CHIPS.map(
      (c) => `<option ${c === activeFilterChip ? 'selected' : ''}>${escapeHtml(c)}</option>`
    ).join('');

    const cardsHtml = filtered.length
      ? filtered
          .map((card) => {
            const totalQ = card.total_questions ?? card.totalQuestions ?? 4;
            const answeredQ = card.answered_count ?? card.completedCount ?? 0;
            const isCompleted = card.done || card.status === 'completed' || (totalQ > 0 && answeredQ >= totalQ);
            const isInProgress = !isCompleted && answeredQ > 0;
            const stateLabel = isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'PRACTICE';
            const btnLabel = isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start';
            const ic = card.icon || getTopicIcon(card.title);
            const percent = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
            const category = card.topic || deriveTopicCategory(card.title);

            const cardBorder = isInProgress ? 'border-brand-text shadow-xs' : 'border-brand-line hover:border-brand-muted/60';
            const labelColor = isCompleted || isInProgress ? 'text-emerald-500' : 'text-brand-muted';
            const btnClasses = isInProgress
              ? 'bg-brand-text text-brand-surface border-brand-text'
              : 'bg-brand-surface border-brand-line text-brand-text hover:bg-brand-surface2';

            return `
              <a class="card flex flex-col bg-brand-surface border rounded-xl p-5 min-h-[130px] transition-all ${cardBorder} ${isInProgress ? 'ip' : ''}" href="#/quiz/${encodeURIComponent(card.id)}">
                <div class="c-label text-[10px] font-semibold tracking-wider ${labelColor} ${isCompleted || isInProgress ? 'g' : ''}">${stateLabel}</div>
                <h3 class="mt-2 font-bold text-[15px] leading-snug tracking-tight text-brand-text">${escapeHtml(card.title)}</h3>
                ${
                  isInProgress || isCompleted
                    ? `<div class="bar h-1 bg-brand-line rounded-full mt-3 overflow-hidden"><i class="block h-full bg-emerald-500 transition-all duration-300" style="width: ${percent}%;"></i></div>`
                    : ''
                }
                <div class="c-foot mt-auto pt-3.5 flex items-center justify-between text-xs text-brand-muted">
                  <span class="tool flex items-center gap-1.5">${icon(ic, 13)} ${escapeHtml(category)}</span>
                  <span class="btn inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-md border transition-colors ${btnClasses} ${isInProgress ? 'dark' : ''}">${btnLabel}</span>
                </div>
              </a>
            `;
          })
          .join('')
      : `<div class="empty col-span-full w-full p-10 text-center text-sm text-brand-muted bg-brand-surface border border-dashed border-brand-line rounded-xl my-2">Nothing matches that search. Clear the search or pick another filter.</div>`;

    const contentHtml = `
      <div class="page p-6 w-full">
        <div class="chips flex flex-wrap gap-2" id="practice-chips">${chipsHtml}</div>
        <div class="tools flex items-center justify-between gap-3 flex-wrap my-5">
          <div class="count text-xs font-semibold text-brand-text" id="practice-count">${countText}</div>
          <div class="tools-r flex items-center gap-2.5 flex-wrap">
            <label class="search flex items-center gap-2 bg-brand-surface border border-brand-line rounded-lg px-2.5 h-8 text-xs text-brand-muted focus-within:border-brand-text/50">
              ${icon('search', 14)}
              <input id="practice-search" class="bg-transparent border-0 outline-none w-44 text-xs text-brand-text placeholder:text-brand-muted" type="search" placeholder="Search practice..." value="${escapeHtml(searchQuery)}" aria-label="Search practice">
            </label>
            <label class="sel flex items-center gap-1.5 bg-brand-surface border border-brand-line rounded-lg px-2.5 h-8 text-xs text-brand-muted">
              <span>Topic:</span>
              <select id="practice-sel" class="bg-transparent border-0 outline-none text-xs font-semibold text-brand-text cursor-pointer pr-1" aria-label="Filter topic">${optionsHtml}</select>
            </label>
          </div>
        </div>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5" id="practice-grid">${cardsHtml}</div>
      </div>
    `;

    container.innerHTML = renderShell('practice', contentHtml, ['Practice Library', 'All Topics']);
    attachShellEvents(container);

    // Event attachments
    const chipsContainer = container.querySelector('#practice-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-chip]') as HTMLButtonElement | null;
        if (btn) {
          activeFilterChip = btn.dataset.chip || 'All';
          renderView();
        }
      });
    }

    const sel = container.querySelector('#practice-sel') as HTMLSelectElement | null;
    if (sel) {
      sel.onchange = () => {
        activeFilterChip = sel.value;
        renderView();
      };
    }

    const searchInput = container.querySelector('#practice-search') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.oninput = () => {
        searchQuery = searchInput.value;
        renderView();
        // Restore focus
        const nextInp = container.querySelector('#practice-search') as HTMLInputElement | null;
        if (nextInp) {
          nextInp.focus();
          nextInp.setSelectionRange(nextInp.value.length, nextInp.value.length);
        }
      };
    }
  }

  renderView();
}
