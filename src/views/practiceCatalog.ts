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
        <div class="page">
          <div class="empty">Loading practice library topics...</div>
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
      (c) => `<button type="button" class="chip ${c === activeFilterChip ? 'on' : ''}" data-chip="${escapeHtml(c)}">${escapeHtml(c)}</button>`
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

            return `
              <a class="card ${isInProgress ? 'ip' : ''}" href="#/quiz/${encodeURIComponent(card.id)}">
                <div class="c-label ${isCompleted || isInProgress ? 'g' : ''}">${stateLabel}</div>
                <h3>${escapeHtml(card.title)}</h3>
                ${
                  isInProgress || isCompleted
                    ? `<div class="bar"><i style="width: ${percent}%;"></i></div>`
                    : ''
                }
                <div class="c-foot">
                  <span class="tool">${icon(ic, 13)} ${escapeHtml(category)}</span>
                  <span class="btn ${isInProgress ? 'dark' : ''}">${btnLabel}</span>
                </div>
              </a>
            `;
          })
          .join('')
      : `<div class="empty">Nothing matches that search. Clear the search or pick another filter.</div>`;

    const contentHtml = `
      <div class="page">
        <div class="chips" id="practice-chips">${chipsHtml}</div>
        <div class="tools">
          <div class="count" id="practice-count">${countText}</div>
          <div class="tools-r">
            <label class="search">
              ${icon('search', 14)}
              <input id="practice-search" type="search" placeholder="Search practice..." value="${escapeHtml(searchQuery)}" aria-label="Search practice">
            </label>
            <label class="sel">
              <span>Topic:</span>
              <select id="practice-sel" aria-label="Filter topic">${optionsHtml}</select>
            </label>
          </div>
        </div>
        <div class="grid" id="practice-grid">${cardsHtml}</div>
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
