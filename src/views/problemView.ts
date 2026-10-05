/**
 * Bento Coding Workbench View (Controller & Orchestrator)
 * Lightweight orchestrator composing layout, resizers, editor, submissions, and console sub-modules.
 */

import {
  getCodingProblemDetail,
  getProblemSubmissions,
  runPython,
  runSql,
} from '../api';
import { attachShellEvents, renderShell } from '../components/shell';
import { escapeHtml } from '../components/icons';
import { showToast } from '../components/toast';
import { bindCodeEditor } from '../editor/editor';
import { navigate } from '../router';
import { setState } from '../state';
import type {
  CodingProblemDetailResponse,
  SubmissionItem,
  TestCaseItem,
} from '../types';

import { getStoredSplitPercentages, setupBentoResizers } from './workbench/workbenchResizer';
import {
  renderLeftPanelTabs,
  renderPendingSubmissionView,
  renderSubmissionDetailView,
  renderSubmissionsList,
  type LeftTabType,
} from './workbench/workbenchSubmissions';
import {
  buildSqlConsoleTables,
  renderConsoleTabsBar,
  renderTestCaseBox,
  renderTestCaseTabs,
  renderTestResultOutput,
  type ConsoleTabType,
} from './workbench/workbenchConsole';
import { renderProblemDescription } from './workbench/workbenchDescription';
import { renderWorkbenchLayout } from './workbench/workbenchLayout';

export async function renderProblemView(container: HTMLElement, problemId: string): Promise<void> {
  container.innerHTML = renderShell(
    'code',
    `<div class="page"><div class="empty">Loading coding problem...</div></div>`,
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

  // Tab & Inspector state
  let currentLeftTab: LeftTabType = 'desc';
  let currentConsoleTab: ConsoleTabType = 'testcase';
  let selectedSubmission: SubmissionItem | null = null;
  let pendingSubmittedCode = '';
  let hasRun = false;
  let activeCaseIdx = 0;
  let customInputActive = false;
  let customInputValue = '';

  const casesList: TestCaseItem[] = problem.testCases || problem.cases || [];
  const testResults: (boolean | null)[] = casesList.map(() => null);

  // Stored split layout percentages
  const { splitX, splitY } = getStoredSplitPercentages();

  const localCodeKey = `again_code_${problem.id}`;
  const starter = problem.starterCode || problem.starter_code || '-- Write your PostgreSQL query statement below\n';
  let userCode = localStorage.getItem(localCodeKey) || starter;
  if (userCode.includes('-- Write your SQL query below\nSELECT')) {
    userCode = starter;
    try {
      localStorage.setItem(localCodeKey, starter);
    } catch {
      // ignore
    }
  }

  function renderLeftTabBody(): string {
    if (currentLeftTab === 'desc') {
      return renderProblemDescription(problem);
    }
    if (currentLeftTab === 'pending') {
      return renderPendingSubmissionView(problem?.language || '', pendingSubmittedCode || userCode);
    }
    if (currentLeftTab === 'detail') {
      return renderSubmissionDetailView(selectedSubmission, problem?.language || 'SQL', userCode);
    }
    return renderSubmissionsList(submissions);
  }

  const workbenchHtml = renderWorkbenchLayout({
    backHref,
    backLabel,
    problemLanguage: problem.language || '',
    problemTitle: problem.title || '',
    splitX,
    splitY,
    langLabel,
    leftPanelTabsHtml: renderLeftPanelTabs(currentLeftTab, selectedSubmission),
    leftPanelBodyHtml: renderLeftTabBody(),
    consoleHeaderHtml: renderConsoleTabsBar(currentConsoleTab, 'Idle', 'text-brand-muted'),
  });

  container.innerHTML = renderShell('code', workbenchHtml, ['Code Library', problem?.title || 'Problem'], 'pm');
  attachShellEvents(container);

  // Setup Bento resizers
  setupBentoResizers(container);

  // Grab interactive elements
  const textarea = container.querySelector('#code-textarea') as HTMLTextAreaElement | null;
  const highlightEl = container.querySelector('#code-highlight') as HTMLElement | null;
  const gutterEl = container.querySelector('#code-gutter') as HTMLElement | null;
  const cursorPosEl = container.querySelector('#editor-cursor-pos') as HTMLElement | null;
  const consoleBody = container.querySelector('#console-card-body') as HTMLElement | null;
  const consoleHeader = container.querySelector('#console-header-container') as HTMLElement | null;

  let lastConsoleOutputHtml = '';
  let consoleStatusText = 'Idle';
  let consoleStatusClass = 'text-brand-muted';

  function updateConsoleHeader(): void {
    if (consoleHeader) {
      consoleHeader.innerHTML = renderConsoleTabsBar(currentConsoleTab, consoleStatusText, consoleStatusClass);
      wireConsoleHeaderEvents();
    }
  }

  function renderConsoleBody(): void {
    if (!consoleBody) return;

    if (currentConsoleTab === 'testcase') {
      consoleBody.innerHTML = `
        <div class="flex flex-col gap-3 font-sans">
          <div class="tc-tabs flex items-center gap-2 flex-wrap" id="tc-tabs-bar">
            ${renderTestCaseTabs(casesList, activeCaseIdx, customInputActive, testResults)}
          </div>
          <div class="tc-box bg-brand-surface2 border border-brand-line rounded-lg p-3 flex flex-col gap-2">
            ${renderTestCaseBox(casesList, activeCaseIdx, customInputActive, customInputValue)}
          </div>
        </div>
      `;
      wireTestCaseEvents();
    } else {
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
      tabsBar.innerHTML = renderLeftPanelTabs(currentLeftTab, selectedSubmission);
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

  function wireConsoleHeaderEvents(): void {
    const consoleTabsBar = container.querySelector('#console-tabs-bar');
    if (consoleTabsBar) {
      consoleTabsBar.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-ctab]') as HTMLButtonElement | null;
        if (btn && btn.dataset.ctab) {
          currentConsoleTab = btn.dataset.ctab as ConsoleTabType;
          updateConsoleHeader();
          renderConsoleBody();
        }
      });
    }
  }

  wireConsoleHeaderEvents();
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
      consoleStatusText = 'Running...';
      consoleStatusClass = 'text-amber-500';
      updateConsoleHeader();
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
        consoleStatusText = 'Execution Error';
        consoleStatusClass = 'text-rose-500';
        updateConsoleHeader();
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
        setState({ studyPlans: [] });
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

    if (isAccepted) {
      runPython({ problemId, code: userCode, is_submission: true }).catch(() => {});
      setState({ studyPlans: [] });
    }

    // Run action -> output to Test Result console
    consoleStatusText = `${res.status} (${ms}ms)`;
    consoleStatusClass = isAccepted ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold';
    updateConsoleHeader();

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
        setState({ studyPlans: [] });
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

    if (isAccepted) {
      runSql({ problemId, userQuery: userCode, is_submission: true }).catch(() => {});
      setState({ studyPlans: [] });
    }

    // Run action -> formatted ASCII tables in console
    consoleStatusText = `${res.status} (${ms}ms)`;
    consoleStatusClass = isAccepted ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold';
    updateConsoleHeader();

    const tc = casesList[activeCaseIdx];
    const { inputTable, outputTable, expectedTable } = buildSqlConsoleTables(res, tc);

    lastConsoleOutputHtml = renderTestResultOutput(
      res.status,
      ms,
      isAccepted,
      inputTable,
      outputTable,
      expectedTable,
      res.diff || undefined,
      res.error || undefined
    );

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
