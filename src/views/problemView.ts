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
  const fileExt = isSql ? 'sql' : 'py';
  const langLabel = isSql ? 'PostgreSQL' : 'Python 3';

  // Navigation back breadcrumb
  const planId = problem.planId || problem.plan_id;
  const backHref = planId ? `#/plans/${encodeURIComponent(planId)}` : '#/code';
  const backLabel = planId ? 'Study Plan' : 'Code Library';

  // UI state
  let currentTab: 'desc' | 'subs' = 'desc';
  let activeCaseIdx = 0;
  let customInputActive = false;
  let customInputValue = '';
  const casesList: TestCaseItem[] = problem.testCases || problem.cases || [];
  const testResults: (boolean | null)[] = casesList.map(() => null);

  const localCodeKey = `again_code_${problem.id}`;
  const starter = problem.starterCode || problem.starter_code || '';
  let userCode = localStorage.getItem(localCodeKey) || starter;

  function renderWorkbench(): void {
    const testCases: TestCaseItem[] = casesList;

    const tcTabsHtml = testCases
      .map((_, idx) => {
        const res = testResults[idx];
        const dotCls = res === true ? 'ok' : res === false ? 'bad' : '';
        const isSelected = !customInputActive && activeCaseIdx === idx;
        return `
          <button type="button" class="${isSelected ? 'on' : ''}" data-case="${idx}">
            <span class="dot ${dotCls}"></span>Case ${idx + 1}
          </button>
        `;
      })
      .join('') +
      `
        <button type="button" class="${customInputActive ? 'on' : ''}" data-case="custom">
          <span class="dot"></span>Custom
        </button>
      `;

    let tcBoxHtml = '';
    if (customInputActive) {
      tcBoxHtml = `
        <label for="custom-input-field">CUSTOM INPUT (JSON OR RAW STRING)</label>
        <input id="custom-input-field" value="${escapeHtml(customInputValue)}" placeholder="e.g. { &quot;nums&quot;: [2, 7, 11, 15], &quot;target&quot;: 9 }">
      `;
    } else if (testCases[activeCaseIdx]) {
      const tc = testCases[activeCaseIdx];
      const tcInp = tc.inputData !== undefined ? tc.inputData : tc.input;
      const tcOut = tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected_output;
      const rawInput =
        typeof tcInp === 'object'
          ? JSON.stringify(tcInp)
          : String(tcInp ?? '');
      const rawOutput =
        typeof tcOut === 'object'
          ? JSON.stringify(tcOut)
          : String(tcOut ?? '');

      tcBoxHtml = `
        <label>INPUT</label>
        <input readonly value="${escapeHtml(rawInput)}">
        <label>EXPECTED OUTPUT</label>
        <input readonly value="${escapeHtml(rawOutput)}">
      `;
    }

    const descMarkdown = problem?.descriptionMarkdown || problem?.description_md || '';
    const descHtml = `
      <div class="tags">
        <span class="tg lang">${escapeHtml(problem?.language || '')}</span>
        <span class="tg ${escapeHtml(problem?.difficulty || '')}">${escapeHtml(problem?.difficulty || '')}</span>
      </div>
      <h2>${escapeHtml(problem?.title || '')}</h2>
      <div style="line-height: 1.65; color: var(--muted); font-size: 13.5px; margin-top: 10px;">
        ${escapeHtml(descMarkdown).replace(/\n/g, '<br>')}
      </div>

      <div class="tc-h">
        <b class="h4" style="margin: 0;">TEST CASES</b>
        <button type="button" class="link" id="toggle-custom-input-btn">
          ${customInputActive ? '- Default test cases' : '+ Custom Input'}
        </button>
      </div>

      <div class="tc-tabs" id="tc-tabs-bar">${tcTabsHtml}</div>
      <div class="tc-box">${tcBoxHtml}</div>
    `;

    const subsHtml = submissions.length
      ? `
        <table class="subs">
          <thead>
            <tr>
              <th>Status</th>
              <th>Language</th>
              <th>Runtime</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${submissions
              .map((s) => {
                const isAccepted = s.status === 'Accepted';
                return `
                  <tr>
                    <td class="${isAccepted ? 'ok-t' : 'bad-t'}">${escapeHtml(s.status)}</td>
                    <td>${escapeHtml(s.language)}</td>
                    <td>${s.executionTimeMs} ms</td>
                    <td>${escapeHtml(s.createdAt)}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      `
      : `<p style="color: var(--muted); padding: 18px 0;">No submissions yet. Write a solution and choose Submit.</p>`;

    const workbenchHtml = `
      <div class="prob">
        <div class="prob-top">
          <div class="crumbs">
            <a class="back" href="${backHref}" id="crumb-back-btn">
              ${icon('left', 14)}
              ${escapeHtml(backLabel)}
            </a>
            <span>/</span>
            <span>${escapeHtml(problem?.language || '')}</span>
            <span>/</span>
            <b>${escapeHtml(problem?.title || '')}</b>
            <span class="ready" id="execution-status-pill">READY</span>
          </div>

          <div class="acts">
            <label class="langsel">
              <select id="problem-lang-sel" aria-label="Language selection">
                <option>${escapeHtml(langLabel)}</option>
              </select>
            </label>
            <button type="button" class="btn" id="run-code-btn">
              ${icon('play', 12)} Run
            </button>
            <button type="button" class="btn dark" id="submit-code-btn">
              ${icon('check', 13)} Submit
            </button>
          </div>
        </div>

        <div class="prob-body">
          <section class="panel left">
            <div class="tabs" id="left-panel-tabs">
              <button type="button" class="${currentTab === 'desc' ? 'on' : ''}" data-tab="desc">
                ${icon('doc', 14)} Description
              </button>
              <button type="button" class="${currentTab === 'subs' ? 'on' : ''}" data-tab="subs">
                ${icon('activity', 14)} Submissions
              </button>
            </div>
            <div class="left-body" id="left-body-content">
              ${currentTab === 'desc' ? descHtml : subsHtml}
            </div>
          </section>

          <section class="ed-panel">
            <div class="ed-head">
              <span class="file">solution.${fileExt}</span>
              <span>UTF-8 &nbsp;&bull;&nbsp; Spaces: 4</span>
            </div>

            <div class="ed">
              <div class="gut" id="code-gutter" aria-hidden="true"></div>
              <div class="code">
                <pre id="code-highlight" aria-hidden="true"></pre>
                <textarea id="code-textarea" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" aria-label="Code editor"></textarea>
              </div>
            </div>

            <div class="cons">
              <div class="cons-h">
                <span>${icon('code', 14)} Execution Console</span>
                <span id="console-status-label" class="m">Idle</span>
              </div>
              <pre id="console-output-pre"><span class="m">Run your code to see output here.</span></pre>
            </div>
          </section>
        </div>
      </div>
    `;

    container.innerHTML = renderShell('code', workbenchHtml, ['Code Library', problem?.title || 'Problem'], 'pm');
    attachShellEvents(container);

    // Wire up code editor
    const textarea = container.querySelector('#code-textarea') as HTMLTextAreaElement | null;
    const highlightEl = container.querySelector('#code-highlight') as HTMLElement | null;
    const gutterEl = container.querySelector('#code-gutter') as HTMLElement | null;

    if (textarea && highlightEl && gutterEl) {
      textarea.value = userCode;
      bindCodeEditor(textarea, highlightEl, gutterEl, kind, (updated) => {
        userCode = updated;
        try {
          localStorage.setItem(localCodeKey, updated);
        } catch {
          // ignore
        }
      });
    }

    // Tab navigation in left pane
    const tabsBar = container.querySelector('#left-panel-tabs');
    if (tabsBar) {
      tabsBar.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('[data-tab]') as HTMLButtonElement | null;
        if (btn && btn.dataset.tab) {
          currentTab = btn.dataset.tab as 'desc' | 'subs';
          renderWorkbench();
        }
      });
    }

    // Test case tabs
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
        renderWorkbench();
      });
    }

    // Toggle custom input button
    const customToggleBtn = container.querySelector('#toggle-custom-input-btn') as HTMLButtonElement | null;
    if (customToggleBtn) {
      customToggleBtn.onclick = () => {
        customInputActive = !customInputActive;
        renderWorkbench();
      };
    }

    // Custom input text listener
    const customInp = container.querySelector('#custom-input-field') as HTMLInputElement | null;
    if (customInp) {
      customInp.oninput = () => {
        customInputValue = customInp.value;
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

    // Run & Submit handlers
    const runBtn = container.querySelector('#run-code-btn') as HTMLButtonElement | null;
    if (runBtn) {
      runBtn.onclick = () => executeCode(false);
    }

    const submitBtn = container.querySelector('#submit-code-btn') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.onclick = () => executeCode(true);
    }
  }

  async function executeCode(isSubmission: boolean): Promise<void> {
    const statusPill = container.querySelector('#execution-status-pill') as HTMLElement | null;
    const consoleStatus = container.querySelector('#console-status-label') as HTMLElement | null;
    const consoleOutput = container.querySelector('#console-output-pre') as HTMLElement | null;

    if (statusPill) {
      statusPill.textContent = 'RUNNING';
      statusPill.className = 'ready run';
    }
    if (consoleStatus) {
      consoleStatus.textContent = 'Running...';
      consoleStatus.className = 'm';
    }
    if (consoleOutput) {
      consoleOutput.innerHTML = '<span class="m">Executing sandbox environment...</span>';
    }

    try {
      if (isSql) {
        const res = await runSql({ problemId, userQuery: userCode });
        handleSqlResult(res, isSubmission);
      } else {
        const res = await runPython({ problemId, code: userCode });
        handlePythonResult(res, isSubmission);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      if (statusPill) {
        statusPill.textContent = 'ERROR';
        statusPill.className = 'ready err';
      }
      if (consoleStatus) {
        consoleStatus.textContent = 'Execution Error';
        consoleStatus.className = 'r';
      }
      if (consoleOutput) {
        consoleOutput.innerHTML = `<span class="r">${escapeHtml(msg)}</span>`;
      }
    }
  }

  function handlePythonResult(
    res: { passed: boolean; status: string; passedCount?: number; passed_count?: number; totalCount?: number; total_count?: number; output: string; durationMs?: number; duration_ms?: number; runtime_ms?: number; error?: string | null },
    isSubmission: boolean
  ): void {
    const statusPill = container.querySelector('#execution-status-pill') as HTMLElement | null;
    const consoleStatus = container.querySelector('#console-status-label') as HTMLElement | null;
    const consoleOutput = container.querySelector('#console-output-pre') as HTMLElement | null;

    if (statusPill) {
      statusPill.textContent = 'READY';
      statusPill.className = 'ready';
    }

    for (let i = 0; i < testResults.length; i++) {
      testResults[i] = res.passed;
    }

    const ms = res.durationMs ?? res.duration_ms ?? res.runtime_ms ?? 0;
    const total = res.totalCount ?? res.total_count ?? 3;
    const passedCount = res.passedCount ?? res.passed_count ?? 0;

    if (res.passed) {
      if (consoleStatus) {
        consoleStatus.textContent = `Passed (${ms}ms)`;
        consoleStatus.className = 'g';
      }
      if (consoleOutput) {
        consoleOutput.innerHTML = `stdout:\n${escapeHtml(res.output)}\n<span class="g">&#10003; All ${total} test cases passed.</span>`;
      }
      if (isSubmission) {
        markProblemSolved(problemId);
        showToast('Accepted. Marked as solved.', 'Next problem', () => {
          if (problem?.planId) {
            navigate(`#/plans/${encodeURIComponent(problem.planId)}`);
          } else {
            navigate('#/code');
          }
        });
      }
    } else {
      if (consoleStatus) {
        consoleStatus.textContent = `${res.status} (${ms}ms)`;
        consoleStatus.className = 'r';
      }
      const errDetail = res.error ? `\n${escapeHtml(res.error)}` : '';
      if (consoleOutput) {
        consoleOutput.innerHTML = `<span class="r">${escapeHtml(res.status)}: ${passedCount}/${total} test cases passed.${errDetail}</span>\n${escapeHtml(res.output)}`;
      }
      if (isSubmission) {
        showToast('Wrong answer. Check the console for details.');
      }
    }

    // Refresh submissions history after run/submission
    getProblemSubmissions(problemId)
      .then((updated) => {
        submissions = updated;
      })
      .catch(() => {});
  }

  function handleSqlResult(
    res: { passed: boolean; status: string; columns?: string[]; rows?: unknown[][]; durationMs?: number; duration_ms?: number; runtime_ms?: number; error?: string | null },
    isSubmission: boolean
  ): void {
    const statusPill = container.querySelector('#execution-status-pill') as HTMLElement | null;
    const consoleStatus = container.querySelector('#console-status-label') as HTMLElement | null;
    const consoleOutput = container.querySelector('#console-output-pre') as HTMLElement | null;

    if (statusPill) {
      statusPill.textContent = 'READY';
      statusPill.className = 'ready';
    }

    for (let i = 0; i < testResults.length; i++) {
      testResults[i] = res.passed;
    }

    const ms = res.durationMs ?? res.duration_ms ?? res.runtime_ms ?? 0;
    const rowCount = res.rows ? res.rows.length : 0;
    const cols = res.columns ? res.columns.join(' | ') : '';
    const tableRows = res.rows
      ? res.rows
          .slice(0, 5)
          .map((r) => (Array.isArray(r) ? r.join(' | ') : JSON.stringify(r)))
          .join('\n')
      : '';

    if (res.passed) {
      if (consoleStatus) {
        consoleStatus.textContent = `Passed (${ms}ms)`;
        consoleStatus.className = 'g';
      }
      if (consoleOutput) {
        consoleOutput.innerHTML = `<span class="g">&#10003; Output matched expected dataset (${rowCount} rows).</span>\n${escapeHtml(cols)}\n${escapeHtml(tableRows)}`;
      }
      if (isSubmission) {
        markProblemSolved(problemId);
        showToast('Accepted. Query matches canonical solution.');
      }
    } else {
      if (consoleStatus) {
        consoleStatus.textContent = `${res.status} (${ms}ms)`;
        consoleStatus.className = 'r';
      }
      const errText = res.error ? `\n${escapeHtml(res.error)}` : '';
      if (consoleOutput) {
        consoleOutput.innerHTML = `<span class="r">${escapeHtml(res.status)}${errText}</span>`;
      }
      if (isSubmission) {
        showToast('Query did not match canonical output.');
      }
    }

    getProblemSubmissions(problemId)
      .then((updated) => {
        submissions = updated;
      })
      .catch(() => {});
  }

  renderWorkbench();
}
