/**
 * Problem Description Tab Renderer
 */

import { escapeHtml } from '../../components/icons';
import { renderMarkdown } from '../../utils/markdown';
import type { CodingProblemDetailResponse } from '../../types';

export function renderProblemDescription(problem: CodingProblemDetailResponse | null): string {
  const descMarkdown = problem?.descriptionMarkdown || problem?.description_md || '';
  const diffBadgeColor =
    problem?.difficulty === 'Easy'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      : problem?.difficulty === 'Medium'
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400';

  return `
    <div class="tags flex items-center gap-2 mb-3">
      <span class="tg lang text-xs font-semibold px-2.5 py-0.5 rounded bg-brand-surface2 border border-brand-line text-brand-text">${escapeHtml(problem?.language || '')}</span>
      <span class="tg text-xs font-semibold px-2.5 py-0.5 rounded ${diffBadgeColor}">${escapeHtml(problem?.difficulty || '')}</span>
    </div>
    <h2 class="text-xl font-bold tracking-tight text-brand-text mb-4">${escapeHtml(problem?.title || '')}</h2>
    <div class="text-sm leading-relaxed space-y-2">
      ${renderMarkdown(descMarkdown)}
    </div>
  `;
}
