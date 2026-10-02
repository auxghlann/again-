import {
  getCodingProblemDetail,
  getProblemSubmissions,
  runPython,
  runSql,
} from '../api';
import { attachShellEvents, renderShell } from '../components/shell';
import { escapeHtml, icon } from '../components/icons';
import { showToast } from '../components/toast';
import { bindCodeEditor } from '../editor/editor';
import { navigate } from '../router';
import type {
  CodingProblemDetailResponse,
  SubmissionItem,
  TestCaseItem,
} from '../types';

import { renderMarkdown } from '../utils/markdown';
import { formatAsciiTable } from '../utils/tableFormatter';

const SOLVED_STORAGE_KEY = 'again_solved_problems';

function markProblemSolved(problemId: string): void {
  try {
    const raw = localStorage.getItem(SOLVED_STORAGE_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(problemId);
    localStorage.setItem(SOLVED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

function formatSingleTableHtml(tableName: string | null, cols: string[], rows: Record<string, unknown>[] | null): string {
  let tableHtml = `<div class="rounded-lg border border-brand-line overflow-hidden my-1.5 bg-brand-surface text-xs font-mono">`;
  if (tableName) {
    tableHtml += `<div class="px-2.5 py-1 bg-brand-surface2 border-b border-brand-line font-semibold text-[11px] text-brand-muted">Table: <span class="text-brand-text">${escapeHtml(tableName)}</span></div>`;
  }
  tableHtml += `<div class="overflow-x-auto"><table class="w-full text-left text-[11px]"><thead class="bg-brand-surface2/60 border-b border-brand-line text-brand-muted"><tr>`;
  for (const col of cols) {
    tableHtml += `<th class="px-2.5 py-1 font-semibold">${escapeHtml(col)}</th>`;
  }
  tableHtml += `</tr></thead>`;
  if (rows && rows.length > 0) {
    tableHtml += `<tbody class="divide-y divide-brand-line text-brand-text">`;
    for (const row of rows) {
      tableHtml += `<tr>`;
      for (const col of cols) {
        tableHtml += `<td class="px-2.5 py-1 whitespace-nowrap">${escapeHtml(String(row[col] ?? ''))}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody>`;
  } else {
    tableHtml += `<tbody class="text-brand-muted"><tr><td colspan="${cols.length}" class="px-2.5 py-2 text-center text-xs">(0 rows)</td></tr></tbody>`;
  }
  tableHtml += `</table></div></div>`;
  return tableHtml;
}

function formatTestCaseData(val: unknown): string {
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    // Check if it's a multi-table dictionary: { tables: { TableName: { columns, rows } } }
    if (obj.tables && typeof obj.tables === 'object' && !Array.isArray(obj.tables)) {
      const tables = obj.tables as Record<string, { columns?: string[]; rows?: Record<string, unknown>[] }>;
      let html = '';
      for (const [tName, tData] of Object.entries(tables)) {
        if (tData && Array.isArray(tData.columns)) {
          html += formatSingleTableHtml(tName, tData.columns, tData.rows || null);
        }
      }
      if (html) return html;
    }
    // Check if it's a single table representation
    if (Array.isArray(obj.columns)) {
      const cols = obj.columns as string[];
      const tableName = (typeof obj.table_name === 'string' ? obj.table_name : typeof obj.table === 'string' ? obj.table : null);
      const rows = Array.isArray(obj.rows) ? (obj.rows as Record<string, unknown>[]) : null;
      return formatSingleTableHtml(tableName, cols, rows);
    }
    return `<input readonly class="w-full bg-brand-surface border border-brand-line rounded-lg px-3 py-1.5 text-xs font-mono text-brand-text outline-none" value="${escapeHtml(JSON.stringify(val))}">`;
  }
  return `<input readonly class="w-full bg-brand-surface border border-brand-line rounded-lg px-3 py-1.5 text-xs font-mono text-brand-text outline-none" value="${escapeHtml(String(val ?? ''))}">`;
}

export async function renderProblemView(container: HTMLElement, problemId: string): Promise<void> {
  container.innerHTML = renderShell(
    'code',
    `
      <div class="page">
        <div class="empty">Loading coding problem...</div>
      </div>
    `,
    ['Code Library', 'Loading...'],
    'pm'
  );
  attachShellEvents(container);

  let problem: CodingProblemDetailResponse | null = null;
  let submissions: SubmissionItem[] = [];

  try {
    const [probRes, subsRes] = await Promise.all([
      getCodingProblemDetail(problemId),
      getProblemSubmissions(problemId).catch(() => []),
    ]);
    problem = probRes;
    submissions = subsRes;
  } catch {
    container.innerHTML = renderShell(
      'code',
      `
        <div class="page">
          <div class="empty">
            <h2>Problem not found</h2>
            <p class="sub">Could not load problem "${escapeHtml(problemId)}".</p>
            <div style="margin-top: 18px;">
              <a class="btn dark lg" href="#/code">Back to Code Library</a>
            </div>
          </div>
        </div>
      `,
      ['Code Library', 'Not Found']
    );
    attachShellEvents(container);
    return;
  }

  const isSql = problem.language.toLowerCase() === 'sql';
  const kind: 'sql' | 'py' = isSql ? 'sql' : 'py';
  const langLabel = isSql ? 'PostgreSQL' : 'Python 3';

  // Navigation back breadcrumb
  const planId = problem.planId || problem.plan_id;
  const backHref = planId ? `#/plans/${encodeURIComponent(planId)}` : '#/code';
  const backLabel = planId ? 'Study Plan' : 'Code Library';

  // UI state
  type LeftTabType = 'desc' | 'subs' | 'pending' | 'detail';
  type ConsoleTabType = 'testcase' | 'result';
  let currentLeftTab: LeftTabType = 'desc';
  let currentConsoleTab: ConsoleTabType = 'testcase';
  let selectedSubmission: SubmissionItem | null = null;
  let pendingSubmittedCode = '';
  const isLTab = (tab: LeftTabType): boolean => (currentLeftTab as string) === tab;
  const isCTab = (tab: ConsoleTabType): boolean => (currentConsoleTab as string) === tab;
  let hasRun = false;
  let activeCaseIdx = 0;
  let customInputActive = false;
  let customInputValue = '';
  const casesList: TestCaseItem[] = problem.testCases || problem.cases || [];
  const testResults: (boolean | null)[] = casesList.map(() => null);

  // Stored split layout percentages
  let splitX = parseFloat(localStorage.getItem('again_bento_split_x') || '45');
  let splitY = parseFloat(localStorage.getItem('again_bento_split_y') || '58');

  // Clamp initial values
  splitX = Math.min(Math.max(splitX, 22), 75);
  splitY = Math.min(Math.max(splitY, 25), 80);

  const localCodeKey = `again_code_${problem.id}`;
  const starter = problem.starterCode || problem.starter_code || '-- Write your PostgreSQL query statement below\n';
  let userCode = localStorage.getItem(localCodeKey) || starter;
  // Normalize legacy boilerplate to clean comment starter
  if (userCode.includes('-- Write your SQL query below\nSELECT')) {
    userCode = starter;
    try {
      localStorage.setItem(localCodeKey, starter);
    } catch {
      // ignore
    }
  }

  function renderTestCaseBox(): string {
    if (customInputActive) {
      return `
        <label for="custom-input-field" class="text-[10px] font-bold tracking-wider text-brand-muted uppercase">CUSTOM INPUT (JSON OR RAW STRING)</label>
        <input id="custom-input-field" class="w-full bg-brand-surface border border-brand-line rounded-lg px-3 py-2 text-xs font-mono text-brand-text outline-none focus:border-indigo-500" value="${escapeHtml(customInputValue)}" placeholder="e.g. { &quot;nums&quot;: [2, 7, 11, 15], &quot;target&quot;: 9 }">
      `;
    }
    if (casesList[activeCaseIdx]) {
      const tc = casesList[activeCaseIdx];
      const tcInp = tc.inputData !== undefined ? tc.inputData : tc.input;
      const tcOut = tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected_output;

      return `
        <label class="text-[10px] font-bold tracking-wider text-brand-muted uppercase">INPUT</label>
        ${formatTestCaseData(tcInp)}
        <label class="text-[10px] font-bold tracking-wider text-brand-muted uppercase mt-2">EXPECTED OUTPUT</label>
        ${formatTestCaseData(tcOut)}
      `;
    }
    return `<span class="text-xs text-brand-muted">No test cases available.</span>`;
  }

  function renderTestCaseTabs(): string {
    return casesList
      .map((_, idx) => {
        const res = testResults[idx];
        const dotBg = res === true ? 'bg-emerald-500' : res === false ? 'bg-rose-500' : 'bg-brand-muted/40';
        const isSelected = !customInputActive && activeCaseIdx === idx;
        const tabClasses = isSelected
          ? 'bg-brand-surface border-brand-text text-brand-text shadow-xs font-semibold'
          : 'bg-brand-surface2 border-brand-line text-brand-muted hover:text-brand-text';
        return `
          <button type="button" class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${tabClasses}" data-case="${idx}">
            <span class="w-1.5 h-1.5 rounded-full ${dotBg}"></span>Case ${idx + 1}
          </button>
        `;
      })
      .join('') +
      `
        <button type="button" class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${customInputActive ? 'bg-brand-surface border-brand-text text-brand-text shadow-xs font-semibold' : 'bg-brand-surface2 border-brand-line text-brand-muted hover:text-brand-text'}" data-case="custom">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-muted/40"></span>Custom
        </button>
      `;
  }

  function renderLeftPanelTabs(): string {
    let tabsHtml = `
      <button type="button" id="tab-btn-desc" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${isLTab('desc') ? 'active bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'}" data-ltab="desc">
        ${icon('doc', 13)} Description
      </button>
      <button type="button" id="tab-btn-subs" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${isLTab('subs') ? 'active bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'}" data-ltab="subs">
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

  function renderLeftTabBody(): string {
    if (currentLeftTab === 'desc') {
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

    if (currentLeftTab === 'pending') {
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
            <div class="text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1.5 font-sans">Code | ${escapeHtml(problem?.language || '')}</div>
            <pre class="p-3.5 rounded-xl bg-[#081120] text-[#e6ecf5] font-mono text-xs overflow-x-auto leading-relaxed border border-[#1b2740]">${escapeHtml(pendingSubmittedCode || userCode)}</pre>
          </div>
        </div>
      `;
    }

    if (currentLeftTab === 'detail') {
      const isAccepted = selectedSubmission?.status === 'Accepted';
      const runtimeVal = selectedSubmission?.runtime_ms ?? selectedSubmission?.runtimeMs ?? selectedSubmission?.executionTimeMs ?? 0;
      const codeVal = selectedSubmission?.submitted_code ?? selectedSubmission?.submittedCode ?? selectedSubmission?.code ?? userCode;
      const dateVal = selectedSubmission?.created_at ?? selectedSubmission?.createdAt ?? 'Just now';
      const langVal = selectedSubmission?.language ?? problem?.language ?? 'SQL';

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

    // Submissions tab
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

  const workbenchHtml = `
    <div class="prob flex-1 flex flex-col h-full max-h-full min-h-0 overflow-hidden w-full">
      <!-- Breadcrumb Bar -->
      <div class="prob-top h-10 flex-none flex items-center justify-between px-3 sm:px-4 bg-brand-surface border-b border-brand-line text-xs gap-3">
        <div class="crumbs flex items-center gap-2 text-brand-muted text-xs truncate">
          <a class="back inline-flex items-center gap-1 font-semibold text-brand-text hover:text-brand-muted transition-colors" href="${backHref}" id="crumb-back-btn">
            ${icon('left', 14)}
            ${escapeHtml(backLabel)}
          </a>
          <span class="text-brand-muted/40">/</span>
          <span>${escapeHtml(problem?.language || '')}</span>
          <span class="text-brand-muted/40">/</span>
          <b class="text-brand-text font-semibold truncate">${escapeHtml(problem?.title || '')}</b>
          <span class="ready ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" id="execution-status-pill">READY</span>
        </div>
      </div>

      <!-- Bento Workspace Canvas -->
      <div class="bento-workspace flex-1 flex p-2 gap-2 min-h-0 h-full max-h-full overflow-hidden bg-brand-bg select-none-during-drag" id="bento-workspace">
        
        <!-- Left Panel: Problem Card -->
        <section id="bento-left" class="flex flex-col min-w-[280px] max-w-[80%] h-full max-h-full min-h-0 rounded-xl border border-brand-line bg-brand-surface shadow-xs overflow-hidden shrink-0" style="width: ${splitX}%;">
          <!-- Header Tabs -->
          <div class="h-10 flex items-center border-b border-brand-line px-3 bg-brand-surface2/50 shrink-0 gap-1" id="left-panel-tabs">
            ${renderLeftPanelTabs()}
          </div>

          <!-- Body Content -->
          <div class="flex-1 min-h-0 p-5 overflow-y-auto scrollbar-thin" id="left-card-body">
            ${renderLeftTabBody()}
          </div>
        </section>

        <!-- Vertical Resizer Gutter -->
        <div id="bento-col-resizer" class="w-2 shrink-0 flex items-center justify-center cursor-col-resize group select-none touch-none" title="Drag to resize panels">
          <div class="w-1 h-8 rounded-full bg-brand-line group-hover:bg-blue-500 group-hover:h-14 group-hover:w-1.5 transition-all duration-150"></div>
        </div>

        <!-- Right Stack: Editor & Console -->
        <section id="bento-right" class="flex-1 flex flex-col min-w-[320px] min-h-0 h-full max-h-full gap-2 overflow-hidden">
          
          <!-- Right Top Card: Code Editor -->
          <div id="bento-editor-card" class="flex flex-col min-h-[140px] max-h-[85%] rounded-xl border border-brand-line bg-[#081120] shadow-xs overflow-hidden shrink-0" style="height: ${splitY}%;">
            <!-- Editor Top Bar -->
            <div class="h-10 flex-none flex items-center justify-between px-3 text-xs bg-[#0c1626] border-b border-[#1b2740] gap-2">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded bg-[#182234] border border-[#25314a] text-white font-semibold text-xs flex items-center gap-1">
                  ${escapeHtml(langLabel)}
                </span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#182234] text-[#8d9bb3]">Auto</span>
              </div>

              <!-- Run / Action Buttons -->
              <div class="flex items-center gap-2">
                <button type="button" class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#182234] hover:bg-[#25314a] text-white border border-[#25314a] transition-colors cursor-pointer" id="run-code-btn" title="Run code (Ctrl + ')">
                  ${icon('play', 12)} Run <kbd class="ml-1 text-[10px] text-[#8d9bb3] font-mono">Ctrl '</kbd>
                </button>
                <button type="button" class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer" id="submit-code-btn" title="Submit solution">
                  ${icon('check', 13)} Submit
                </button>

                <div class="h-4 w-px bg-[#25314a] mx-1"></div>

                <button type="button" class="p-1.5 rounded hover:bg-[#182234] text-[#8d9bb3] hover:text-white transition-colors cursor-pointer" id="editor-format-btn" title="Format code">
                  ${icon('brackets', 14)}
                </button>
                <button type="button" class="p-1.5 rounded hover:bg-[#182234] text-[#8d9bb3] hover:text-white transition-colors cursor-pointer" id="editor-reset-btn" title="Reset starter code">
                  ${icon('reset', 14)}
                </button>
              </div>
            </div>

            <!-- Editor Body -->
            <div class="ed flex-1 min-h-0 relative flex overflow-hidden font-mono text-xs">
              <div class="gut shrink-0 select-none py-3 px-2.5 text-right font-mono text-xs leading-relaxed whitespace-pre min-w-[2.5rem] text-[#4a5873] border-r border-[#1b2740] bg-[#081120] overflow-hidden" id="code-gutter" aria-hidden="true"></div>
              <div class="code flex-1 relative overflow-hidden">
                <pre id="code-highlight" class="absolute inset-0 p-3 m-0 overflow-hidden pointer-events-none font-mono text-xs leading-relaxed text-[#e6ecf5]" aria-hidden="true"></pre>
                <textarea id="code-textarea" class="absolute inset-0 p-3 m-0 w-full h-full bg-transparent resize-none border-0 outline-none font-mono text-xs leading-relaxed caret-emerald-400 scrollbar-thin" style="-webkit-text-fill-color: transparent !important; color: transparent !important;" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" aria-label="Code editor"></textarea>
              </div>
            </div>

            <!-- Editor Bottom Status Bar -->
            <div class="h-7 flex-none flex items-center justify-between px-3 border-t border-[#1b2740] bg-[#0c1626] text-[11px] font-mono text-[#8d9bb3] select-none">
              <span class="flex items-center gap-1.5 text-emerald-400">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Saved
              </span>
              <span id="editor-cursor-pos" class="text-[#8d9bb3]">Ln 1, Col 1</span>
            </div>
          </div>

          <!-- Horizontal Resizer Gutter -->
          <div id="bento-row-resizer" class="h-2 shrink-0 flex items-center justify-center cursor-row-resize group select-none touch-none" title="Drag to resize console">
            <div class="h-1 w-8 rounded-full bg-brand-line group-hover:bg-blue-500 group-hover:w-14 group-hover:h-1.5 transition-all duration-150"></div>
          </div>

          <!-- Right Bottom Card: Testcase & Console -->
          <div id="bento-console-card" class="flex-1 flex flex-col min-h-0 rounded-xl border border-brand-line bg-brand-surface shadow-xs overflow-hidden">
            <!-- Console Top Bar -->
            <div class="h-10 flex-none flex items-center justify-between px-3 border-b border-brand-line bg-brand-surface2/50 text-xs">
              <div class="flex items-center gap-1" id="console-tabs-bar">
                <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${isCTab('testcase') ? 'bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'}" data-ctab="testcase">
                  ${icon('check', 13)} Testcase
                </button>
                <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${isCTab('result') ? 'bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'}" data-ctab="result">
                  ${icon('terminal', 13)} Test Result
                </button>
              </div>

              <div class="flex items-center gap-2">
                <span id="console-status-label" class="text-xs font-mono text-brand-muted">Idle</span>
              </div>
            </div>

            <!-- Console Body -->
            <div class="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs scrollbar-thin" id="console-card-body">
              <!-- Content rendered dynamically based on active console tab -->
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  container.innerHTML = renderShell('code', workbenchHtml, ['Code Library', problem?.title || 'Problem'], 'pm');
  attachShellEvents(container);

  // Grab elements
  const textarea = container.querySelector('#code-textarea') as HTMLTextAreaElement | null;
  const highlightEl = container.querySelector('#code-highlight') as HTMLElement | null;
  const gutterEl = container.querySelector('#code-gutter') as HTMLElement | null;
  const cursorPosEl = container.querySelector('#editor-cursor-pos') as HTMLElement | null;
  const consoleBody = container.querySelector('#console-card-body') as HTMLElement | null;
  const consoleStatus = container.querySelector('#console-status-label') as HTMLElement | null;

  let lastConsoleOutputHtml = '';

  function renderConsoleBody(): void {
    if (!consoleBody) return;

    if (currentConsoleTab === 'testcase') {
      consoleBody.innerHTML = `
        <div class="flex flex-col gap-3 font-sans">
          <div class="tc-tabs flex items-center gap-2 flex-wrap" id="tc-tabs-bar">
            ${renderTestCaseTabs()}
          </div>
          <div class="tc-box bg-brand-surface2 border border-brand-line rounded-lg p-3 flex flex-col gap-2">
            ${renderTestCaseBox()}
          </div>
        </div>
      `;
      wireTestCaseEvents();
    } else {
      // Test Result tab
      if (!hasRun) {
        consoleBody.innerHTML = `
          <div class="h-full flex items-center justify-center p-6 text-brand-muted text-sm text-center font-sans">
            <span>You must run your code first</span>
          </div>
        `;
      } else {
        consoleBody.innerHTML = `
          <div id="console-output-pre" class="h-full overflow-y-auto text-brand-text text-xs font-mono">${lastConsoleOutputHtml}</div>
        `;
      }
    }
  }

  function wireTestCaseEvents(): void {
    const tcBar = container.querySelector('#tc-tabs-bar');
    if (tcBar) {
      tcBar.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-case]') as HTMLButtonElement | null;
        if (!btn) return;
        if (btn.dataset.case === 'custom') {
          customInputActive = true;
        } else {
          customInputActive = false;
          activeCaseIdx = parseInt(btn.dataset.case || '0', 10);
        }
        renderConsoleBody();
      });
    }

    const customInp = container.querySelector('#custom-input-field') as HTMLInputElement | null;
    if (customInp) {
      customInp.oninput = () => {
        customInputValue = customInp.value;
      };
    }
  }

  // Update cursor position Ln, Col
  function updateCursorPos(): void {
    if (!cursorPosEl || !textarea) return;
    const textBefore = textarea.value.substring(0, textarea.selectionStart);
    const lines = textBefore.split('\n');
    const curLine = lines.length;
    const curCol = lines[lines.length - 1].length + 1;
    cursorPosEl.textContent = `Ln ${curLine}, Col ${curCol}`;
  }

  // Wire up code editor
  if (textarea && highlightEl && gutterEl) {
    textarea.value = userCode;
    bindCodeEditor(textarea, highlightEl, gutterEl, kind, (updated) => {
      userCode = updated;
      try {
        localStorage.setItem(localCodeKey, updated);
      } catch {
        // ignore
      }
      updateCursorPos();
    });

    textarea.addEventListener('keyup', updateCursorPos);
    textarea.addEventListener('click', updateCursorPos);
    textarea.addEventListener('input', updateCursorPos);
    updateCursorPos();
  }

  function updateLeftPanel(): void {
    const tabsBar = container.querySelector('#left-panel-tabs');
    const bodyEl = container.querySelector('#left-card-body');
    if (tabsBar) {
      tabsBar.innerHTML = renderLeftPanelTabs();
    }
    if (bodyEl) {
      bodyEl.innerHTML = renderLeftTabBody();
    }
    wireLeftTabEvents();
  }

  function wireLeftTabEvents(): void {
    const tabsBar = container.querySelector('#left-panel-tabs');
    if (tabsBar) {
      tabsBar.querySelectorAll<HTMLElement>('[data-ltab]').forEach((btn) => {
        btn.onclick = (e) => {
          const target = (e.target as HTMLElement).closest('[data-ltab]') as HTMLElement | null;
          if (target && target.dataset.ltab) {
            currentLeftTab = target.dataset.ltab as LeftTabType;
            updateLeftPanel();
          }
        };
      });

      const closeDetailBtn = container.querySelector('#close-sub-detail-btn');
      if (closeDetailBtn) {
        (closeDetailBtn as HTMLElement).onclick = (e) => {
          e.stopPropagation();
          currentLeftTab = 'subs';
          updateLeftPanel();
        };
      }
    }

    const backToSubs = container.querySelector('#back-to-subs-btn');
    if (backToSubs) {
      (backToSubs as HTMLElement).onclick = () => {
        currentLeftTab = 'subs';
        updateLeftPanel();
      };
    }

    const detailCloseBtn = container.querySelector('#detail-close-btn');
    if (detailCloseBtn) {
      (detailCloseBtn as HTMLElement).onclick = () => {
        currentLeftTab = 'desc';
        updateLeftPanel();
      };
    }

    const subRows = container.querySelectorAll<HTMLElement>('[data-sub-idx]');
    subRows.forEach((row) => {
      row.onclick = () => {
        const idx = parseInt(row.dataset.subIdx || '0', 10);
        selectedSubmission = submissions[idx] || null;
        currentLeftTab = 'detail';
        updateLeftPanel();
      };
    });
  }

  wireLeftTabEvents();

  // Console panel tabs click
  const consoleTabsBar = container.querySelector('#console-tabs-bar');
  if (consoleTabsBar) {
    consoleTabsBar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-ctab]') as HTMLButtonElement | null;
      if (btn && btn.dataset.ctab) {
        currentConsoleTab = btn.dataset.ctab as typeof currentConsoleTab;
        consoleTabsBar.querySelectorAll('[data-ctab]').forEach((b) => {
          const el = b as HTMLElement;
          const isActive = el.dataset.ctab === currentConsoleTab;
          el.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isActive ? 'bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'
          }`;
        });
        renderConsoleBody();
      }
    });
  }

  // Initial console render
  renderConsoleBody();

  // Reset & Format Buttons
  const resetBtn = container.querySelector('#editor-reset-btn') as HTMLButtonElement | null;
  if (resetBtn && textarea) {
    resetBtn.onclick = () => {
      if (confirm('Reset code to starter template?')) {
        textarea.value = starter;
        userCode = starter;
        textarea.dispatchEvent(new Event('input'));
        showToast('Code reset to starter template.');
      }
    };
  }

  const formatBtn = container.querySelector('#editor-format-btn') as HTMLButtonElement | null;
  if (formatBtn && textarea) {
    formatBtn.onclick = () => {
      const lines = textarea.value.split('\n').map((l) => l.trimEnd());
      textarea.value = lines.join('\n');
      textarea.dispatchEvent(new Event('input'));
      showToast('Formatted whitespace.');
    };
  }

  // Drag resizers
  const colResizer = container.querySelector('#bento-col-resizer') as HTMLElement | null;
  const rowResizer = container.querySelector('#bento-row-resizer') as HTMLElement | null;
  const leftCard = container.querySelector('#bento-left') as HTMLElement | null;
  const editorCard = container.querySelector('#bento-editor-card') as HTMLElement | null;
  const workspace = container.querySelector('#bento-workspace') as HTMLElement | null;
  const rightCol = container.querySelector('#bento-right') as HTMLElement | null;

  let isDraggingCol = false;
  let isDraggingRow = false;

  if (colResizer && leftCard && workspace) {
    colResizer.addEventListener('pointerdown', (e: PointerEvent) => {
      isDraggingCol = true;
      colResizer.setPointerCapture(e.pointerId);
      document.body.classList.add('cursor-col-resize', 'select-none');
    });

    colResizer.addEventListener('pointermove', (e: PointerEvent) => {
      if (!isDraggingCol) return;
      const rect = workspace.getBoundingClientRect();
      const percent = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 20), 75);
      leftCard.style.width = `${percent}%`;
      splitX = percent;
    });

    const onPointerUpCol = (e: PointerEvent) => {
      if (!isDraggingCol) return;
      isDraggingCol = false;
      try {
        colResizer.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      document.body.classList.remove('cursor-col-resize', 'select-none');
      localStorage.setItem('again_bento_split_x', splitX.toFixed(1));
    };

    colResizer.addEventListener('pointerup', onPointerUpCol);
    colResizer.addEventListener('pointercancel', onPointerUpCol);
  }

  if (rowResizer && editorCard && rightCol) {
    rowResizer.addEventListener('pointerdown', (e: PointerEvent) => {
      isDraggingRow = true;
      rowResizer.setPointerCapture(e.pointerId);
      document.body.classList.add('cursor-row-resize', 'select-none');
    });

    rowResizer.addEventListener('pointermove', (e: PointerEvent) => {
      if (!isDraggingRow) return;
      const rect = rightCol.getBoundingClientRect();
      const percent = Math.min(Math.max(((e.clientY - rect.top) / rect.height) * 100, 20), 80);
      editorCard.style.height = `${percent}%`;
      splitY = percent;
    });

    const onPointerUpRow = (e: PointerEvent) => {
      if (!isDraggingRow) return;
      isDraggingRow = false;
      try {
        rowResizer.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      document.body.classList.remove('cursor-row-resize', 'select-none');
      localStorage.setItem('again_bento_split_y', splitY.toFixed(1));
    };

    rowResizer.addEventListener('pointerup', onPointerUpRow);
    rowResizer.addEventListener('pointercancel', onPointerUpRow);
  }

  // Back button
  const crumbBack = container.querySelector('#crumb-back-btn') as HTMLAnchorElement | null;
  if (crumbBack) {
    crumbBack.onclick = (e) => {
      e.preventDefault();
      navigate(backHref);
    };
  }

  // Execute Code Logic
  async function executeCode(isSubmission: boolean): Promise<void> {
    if (isSubmission) {
      pendingSubmittedCode = userCode;
      currentLeftTab = 'pending';
      updateLeftPanel();
    } else {
      hasRun = true;
      currentConsoleTab = 'result';

      // Switch console tab to result in UI
      if (consoleTabsBar) {
        consoleTabsBar.querySelectorAll('[data-ctab]').forEach((b) => {
          const el = b as HTMLElement;
          const isActive = el.dataset.ctab === 'result';
          el.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isActive ? 'bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'
          }`;
        });
      }

      if (consoleStatus) {
        consoleStatus.textContent = 'Running...';
        consoleStatus.className = 'text-xs font-mono text-amber-500';
      }

      lastConsoleOutputHtml = '<span class="text-brand-muted">Executing in sandbox environment...</span>';
      renderConsoleBody();
    }

    const statusPill = container.querySelector('#execution-status-pill') as HTMLElement | null;
    if (statusPill) {
      statusPill.textContent = 'RUNNING';
      statusPill.className = 'ready ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400';
    }

    try {
      if (isSql) {
        const res = await runSql({ problemId, userQuery: userCode, is_submission: isSubmission });
        handleSqlResult(res, isSubmission);
      } else {
        const res = await runPython({ problemId, code: userCode, is_submission: isSubmission });
        handlePythonResult(res, isSubmission);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      if (statusPill) {
        statusPill.textContent = 'ERROR';
        statusPill.className = 'ready ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400';
      }
      if (isSubmission) {
        selectedSubmission = {
          id: `err_${Date.now()}`,
          problemId,
          language: isSql ? 'PostgreSQL' : 'Python 3',
          status: 'Runtime Error',
          runtime_ms: 0,
          submitted_code: userCode,
          created_at: new Date().toLocaleTimeString(),
        };
        currentLeftTab = 'detail';
        updateLeftPanel();
        showToast(`Submission error: ${msg}`);
      } else {
        if (consoleStatus) {
          consoleStatus.textContent = 'Execution Error';
          consoleStatus.className = 'text-xs font-mono text-rose-500';
        }
        lastConsoleOutputHtml = `<span class="text-rose-500 font-semibold">${escapeHtml(msg)}</span>`;
        renderConsoleBody();
      }
    }
  }

  function handlePythonResult(
    res: { passed: boolean; status: string; passedCount?: number; passed_count?: number; totalCount?: number; total_count?: number; output: string; durationMs?: number; duration_ms?: number; runtime_ms?: number; error?: string | null },
    isSubmission: boolean
  ): void {
    const statusPill = container.querySelector('#execution-status-pill') as HTMLElement | null;
    if (statusPill) {
      statusPill.textContent = 'READY';
      statusPill.className = 'ready ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }

    for (let i = 0; i < testResults.length; i++) {
      testResults[i] = res.passed;
    }

    const ms = res.durationMs ?? res.duration_ms ?? res.runtime_ms ?? 0;
    const total = res.totalCount ?? res.total_count ?? 3;
    const passedCount = res.passedCount ?? res.passed_count ?? 0;
    const isAccepted = res.passed && res.status === 'Accepted';

    if (isSubmission) {
      selectedSubmission = {
        id: `sub_${Date.now()}`,
        problemId,
        language: 'Python 3',
        status: res.status,
        runtime_ms: ms,
        submitted_code: userCode,
        created_at: new Date().toLocaleTimeString(),
      };
      submissions = [selectedSubmission, ...submissions];
      currentLeftTab = 'detail';
      updateLeftPanel();

      if (isAccepted) {
        markProblemSolved(problemId);
        showToast('Accepted. All test cases passed.');
      } else {
        showToast('Wrong answer. Check submission details.');
      }

      getProblemSubmissions(problemId)
        .then((updated) => {
          submissions = updated;
        })
        .catch(() => {});
      return;
    }

    // Run action -> output to Test Result console
    if (consoleStatus) {
      consoleStatus.textContent = `${res.status} (${ms}ms)`;
      consoleStatus.className = `text-xs font-mono font-semibold ${isAccepted ? 'text-emerald-500' : 'text-rose-500'}`;
    }

    const errDetail = res.error ? `\n\nError: ${escapeHtml(res.error)}` : '';
    lastConsoleOutputHtml = `
      <div class="flex flex-col gap-3 font-mono text-xs">
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm ${isAccepted ? 'text-emerald-500' : 'text-rose-500'}">${escapeHtml(res.status)}</span>
          <span class="text-xs text-brand-muted">Runtime: ${ms} ms (${passedCount}/${total} test cases passed)</span>
        </div>
        <div>
          <div class="text-[11px] font-bold text-brand-muted uppercase tracking-wider mb-1 font-sans">Output</div>
          <pre class="p-3 rounded-xl bg-brand-surface2 border border-brand-line overflow-x-auto text-brand-text leading-relaxed whitespace-pre">${escapeHtml(res.output || '(No stdout)')}${errDetail}</pre>
        </div>
      </div>
    `;
    renderConsoleBody();
  }

  function handleSqlResult(
    res: {
      passed: boolean;
      status: string;
      columns?: string[];
      rows?: unknown[];
      expected_rows?: Record<string, unknown>[];
      durationMs?: number;
      duration_ms?: number;
      runtime_ms?: number;
      diff?: string | null;
      error?: string | null;
    },
    isSubmission: boolean
  ): void {
    const statusPill = container.querySelector('#execution-status-pill') as HTMLElement | null;
    if (statusPill) {
      statusPill.textContent = 'READY';
      statusPill.className = 'ready ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }

    for (let i = 0; i < testResults.length; i++) {
      testResults[i] = res.passed;
    }

    const ms = res.durationMs ?? res.duration_ms ?? res.runtime_ms ?? 0;
    const isAccepted = res.passed && res.status === 'Accepted';

    if (isSubmission) {
      selectedSubmission = {
        id: `sub_${Date.now()}`,
        problemId,
        language: 'PostgreSQL',
        status: res.status,
        runtime_ms: ms,
        submitted_code: userCode,
        created_at: new Date().toLocaleTimeString(),
      };
      submissions = [selectedSubmission, ...submissions];
      currentLeftTab = 'detail';
      updateLeftPanel();

      if (isAccepted) {
        markProblemSolved(problemId);
        showToast('Accepted. Query matches canonical solution.');
      } else {
        showToast(res.status === 'Wrong Answer' ? 'Wrong answer. Query did not match expected dataset.' : 'Execution failed.');
      }

      getProblemSubmissions(problemId)
        .then((updated) => {
          submissions = updated;
        })
        .catch(() => {});
      return;
    }

    // Run action -> formatted ASCII tables in console
    if (consoleStatus) {
      consoleStatus.textContent = `${res.status} (${ms}ms)`;
      consoleStatus.className = `text-xs font-mono font-semibold ${isAccepted ? 'text-emerald-500' : 'text-rose-500'}`;
    }

    const tc = casesList[activeCaseIdx];
    let inputTable = '';
    if (tc) {
      const tcInp = tc.inputData !== undefined ? tc.inputData : tc.input;
      if (tcInp && typeof tcInp === 'object') {
        const inpObj = tcInp as Record<string, unknown>;
        if (inpObj.tables && typeof inpObj.tables === 'object' && !Array.isArray(inpObj.tables)) {
          const tableParts: string[] = [];
          for (const [tName, tData] of Object.entries(inpObj.tables as Record<string, { columns: string[]; rows: (Record<string, unknown> | unknown[])[] }>)) {
            if (tData && Array.isArray(tData.columns)) {
              tableParts.push(`Table: ${tName}\n` + formatAsciiTable(tData.columns, tData.rows || []));
            }
          }
          inputTable = tableParts.join('\n\n');
        } else if (Array.isArray(inpObj.columns)) {
          const tName = typeof inpObj.table_name === 'string' ? `Table: ${inpObj.table_name}\n` : '';
          const rowsList = (inpObj.rows as (Record<string, unknown> | unknown[])[]) || [];
          inputTable = tName + formatAsciiTable(inpObj.columns as string[], rowsList);
        } else {
          inputTable = JSON.stringify(tcInp, null, 2);
        }
      } else if (typeof tcInp === 'string') {
        inputTable = tcInp;
      }
    }

    const userRows = (res.rows || []) as (Record<string, unknown> | unknown[])[];
    const outputTable = res.columns && res.columns.length > 0
      ? formatAsciiTable(res.columns, userRows)
      : '(No rows returned)';

    let expectedTable = '';
    if (res.expected_rows && Array.isArray(res.expected_rows) && res.expected_rows.length > 0) {
      const expCols = Object.keys(res.expected_rows[0]);
      expectedTable = formatAsciiTable(expCols, res.expected_rows);
    } else if (tc) {
      const tcOut = tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected_output;
      if (tcOut && typeof tcOut === 'object' && Array.isArray((tcOut as any).columns)) {
        expectedTable = formatAsciiTable((tcOut as any).columns, (tcOut as any).rows || []);
      } else if (typeof tcOut === 'string') {
        expectedTable = tcOut;
      } else if (tcOut) {
        expectedTable = JSON.stringify(tcOut, null, 2);
      }
    }

    lastConsoleOutputHtml = `
      <div class="flex flex-col gap-2.5 font-mono text-xs">
        <div class="flex items-center justify-between pb-1.5 border-b border-brand-line">
          <div class="flex items-center gap-2">
            <span class="font-bold text-sm ${isAccepted ? 'text-emerald-500' : 'text-rose-500'}">${escapeHtml(res.status)}</span>
            <span class="text-xs text-brand-muted">Runtime: ${ms} ms</span>
          </div>
        </div>

        ${inputTable ? `
        <div>
          <div class="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 font-sans">Input</div>
          <pre class="p-2 rounded-lg bg-brand-surface2 border border-brand-line overflow-x-auto text-brand-text leading-snug whitespace-pre m-0">${escapeHtml(inputTable)}</pre>
        </div>` : ''}

        <div>
          <div class="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 font-sans">Output</div>
          <pre class="p-2 rounded-lg bg-brand-surface2 border border-brand-line overflow-x-auto text-brand-text leading-snug whitespace-pre m-0">${escapeHtml(outputTable)}</pre>
        </div>

        ${expectedTable ? `
        <div>
          <div class="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 font-sans">Expected</div>
          <pre class="p-2 rounded-lg bg-brand-surface2 border border-brand-line overflow-x-auto text-brand-text leading-snug whitespace-pre m-0">${escapeHtml(expectedTable)}</pre>
        </div>` : ''}

        ${res.diff ? `
        <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
          ${escapeHtml(res.diff)}
        </div>` : ''}

        ${res.error ? `
        <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
          ${escapeHtml(res.error)}
        </div>` : ''}
      </div>
    `;

    renderConsoleBody();
  }

  // Run & Submit button listeners
  const runBtn = container.querySelector('#run-code-btn') as HTMLButtonElement | null;
  if (runBtn) {
    runBtn.onclick = () => executeCode(false);
  }

  const submitBtn = container.querySelector('#submit-code-btn') as HTMLButtonElement | null;
  if (submitBtn) {
    submitBtn.onclick = () => executeCode(true);
  }

  // Global Ctrl + ' / Cmd + ' shortcut to run code
  const keydownHandler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "'") {
      e.preventDefault();
      executeCode(false);
    }
  };
  window.addEventListener('keydown', keydownHandler);
}
