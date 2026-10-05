/**
 * Workbench Submissions Subsystem
 * Handles submissions list rendering, detailed inspection card, and pending submission state.
 */

import { escapeHtml, icon } from '../../components/icons';
import type { SubmissionItem } from '../../types';

export type LeftTabType = 'desc' | 'subs' | 'pending' | 'detail';

export function renderLeftPanelTabs(
  currentLeftTab: LeftTabType,
  selectedSubmission: SubmissionItem | null
): string {
  const isLTab = (tab: LeftTabType) => currentLeftTab === tab;

  let tabsHtml = `
    <button type="button" id="tab-btn-desc" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
      isLTab('desc') ? 'active bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'
    }" data-ltab="desc">
      ${icon('doc', 13)} Description
    </button>
    <button type="button" id="tab-btn-subs" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
      isLTab('subs') ? 'active bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'
    }" data-ltab="subs">
      ${icon('activity', 13)} Submissions
    </button>
  `;

  if (currentLeftTab === 'pending') {
    tabsHtml += `
      <button type="button" id="tab-btn-pending" class="active flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-brand-surface text-brand-text shadow-xs cursor-pointer" data-ltab="pending">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        Pending...
      </button>
    `;
  } else if (currentLeftTab === 'detail') {
    const isAcc = selectedSubmission?.status === 'Accepted';
    const label = selectedSubmission?.status || 'Detail';
    tabsHtml += `
      <button type="button" id="tab-btn-detail" class="active flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-brand-surface text-brand-text shadow-xs cursor-pointer" data-ltab="detail">
        <span class="w-1.5 h-1.5 rounded-full ${isAcc ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
        ${escapeHtml(label)}
        <span class="text-brand-muted hover:text-brand-text ml-1" id="close-sub-detail-btn" title="Close details">&times;</span>
      </button>
    `;
  }

  return tabsHtml;
}

export function renderPendingSubmissionView(problemLang: string, code: string): string {
  return `
    <div class="flex flex-col gap-4 font-sans" id="submission-pending-view">
      <div class="flex items-center justify-between pb-3 border-b border-brand-line">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <h3 class="text-base font-bold text-brand-text">Pending...</h3>
          </div>
          <small class="text-brand-muted text-xs">Submitted just now</small>
        </div>
      </div>
      <div class="p-4 rounded-xl bg-brand-surface2 border border-brand-line text-xs font-mono text-brand-text flex items-center gap-3">
        <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
        <span>Preparing runtime environment & executing in sandbox...</span>
      </div>
      <div class="mt-2">
        <div class="text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1.5 font-sans">Code | ${escapeHtml(problemLang)}</div>
        <pre class="p-3.5 rounded-xl bg-[#081120] text-[#e6ecf5] font-mono text-xs overflow-x-auto leading-relaxed border border-[#1b2740]">${escapeHtml(code)}</pre>
      </div>
    </div>
  `;
}

export function renderSubmissionDetailView(
  selectedSubmission: SubmissionItem | null,
  problemLang: string,
  fallbackCode: string
): string {
  const isAccepted = selectedSubmission?.status === 'Accepted';
  const runtimeVal = selectedSubmission?.runtime_ms ?? selectedSubmission?.runtimeMs ?? selectedSubmission?.executionTimeMs ?? 0;
  const codeVal = selectedSubmission?.submitted_code ?? selectedSubmission?.submittedCode ?? selectedSubmission?.code ?? fallbackCode;
  const dateVal = selectedSubmission?.created_at ?? selectedSubmission?.createdAt ?? 'Just now';
  const langVal = selectedSubmission?.language ?? problemLang ?? 'SQL';

  return `
    <div class="flex flex-col gap-4 font-sans" id="submission-detail-view">
      <div class="flex items-center justify-between pb-3 border-b border-brand-line">
        <button type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors cursor-pointer" id="back-to-subs-btn">
          ${icon('left', 13)} All Submissions
        </button>
        <button type="button" class="text-brand-muted hover:text-brand-text p-1 rounded hover:bg-brand-surface text-sm cursor-pointer" id="detail-close-btn" title="Back to Description">
          &times;
        </button>
      </div>

      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xl font-bold ${isAccepted ? 'text-emerald-500' : 'text-rose-500'}" id="submission-detail-title">
            ${escapeHtml(selectedSubmission?.status || 'Submitted')}
          </span>
        </div>
        <span class="text-xs text-brand-muted" id="submission-detail-date">${escapeHtml(dateVal)}</span>
      </div>

      <!-- Metric Box -->
      <div class="p-4 rounded-xl bg-brand-surface2 border border-brand-line flex items-center gap-6">
        <div>
          <div class="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Runtime</div>
          <div class="text-lg font-mono font-bold text-brand-text mt-0.5" id="submission-detail-runtime">
            ${runtimeVal} ms
          </div>
        </div>
        <div class="h-8 w-px bg-brand-line"></div>
        <div>
          <div class="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Testcases</div>
          <div class="text-sm font-semibold text-brand-text mt-0.5" id="submission-detail-cases">
            ${isAccepted ? 'All testcases passed' : 'Wrong Answer'}
          </div>
        </div>
        <div class="h-8 w-px bg-brand-line"></div>
        <div>
          <div class="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Language</div>
          <div class="text-sm font-semibold text-brand-text mt-0.5">${escapeHtml(langVal)}</div>
        </div>
      </div>

      <!-- Submitted Code Snippet -->
      <div class="mt-2">
        <div class="text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1.5 font-sans">Code | ${escapeHtml(langVal)}</div>
        <pre class="p-3.5 rounded-xl bg-[#081120] text-[#e6ecf5] font-mono text-xs overflow-x-auto leading-relaxed border border-[#1b2740]" id="submission-detail-code">${escapeHtml(codeVal)}</pre>
      </div>
    </div>
  `;
}

export function renderSubmissionsList(submissions: SubmissionItem[]): string {
  if (!submissions.length) {
    return `<p class="text-brand-muted py-8 text-center text-sm">No submissions recorded yet. Write your query and click Submit.</p>`;
  }

  return `
    <div class="rounded-xl border border-brand-line overflow-hidden shadow-xs">
      <table class="w-full text-left text-xs">
        <thead class="bg-brand-surface2 border-b border-brand-line text-[11px] font-semibold text-brand-muted">
          <tr>
            <th class="p-3">Status</th>
            <th class="p-3">Language</th>
            <th class="p-3">Runtime</th>
            <th class="p-3">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-brand-line">
          ${submissions
            .map((s, idx) => {
              const isAccepted = s.status === 'Accepted';
              const runMs = s.runtime_ms ?? s.runtimeMs ?? s.executionTimeMs ?? 0;
              const dateStr = s.created_at ?? s.createdAt ?? 'Recent';
              return `
                <tr class="sub-row hover:bg-brand-surface2/50 transition-colors cursor-pointer group" data-sub-idx="${idx}" title="Click to view submission details">
                  <td class="p-3 font-semibold ${isAccepted ? 'text-emerald-500' : 'text-rose-500'} group-hover:underline">${escapeHtml(s.status)}</td>
                  <td class="p-3">${escapeHtml(s.language)}</td>
                  <td class="p-3 font-mono">${runMs} ms</td>
                  <td class="p-3 text-brand-muted">${escapeHtml(dateStr)}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}
