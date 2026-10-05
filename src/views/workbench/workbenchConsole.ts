/**
 * Workbench Console Subsystem
 * Manages testcase chips, input/output inspection boxes, and compact ASCII result formatting.
 */

import { escapeHtml, icon } from '../../components/icons';
import { formatAsciiTable, formatTestCaseData } from '../../utils/tableFormatter';
import type { TestCaseItem } from '../../types';

export type ConsoleTabType = 'testcase' | 'result';

export function renderConsoleTabsBar(currentConsoleTab: ConsoleTabType, statusText: string, statusClass: string): string {
  const isCTab = (tab: ConsoleTabType) => currentConsoleTab === tab;

  return `
    <div class="flex items-center gap-1" id="console-tabs-bar" role="tablist" aria-label="Console tabs">
      <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
        isCTab('testcase') ? 'bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'
      }" data-ctab="testcase" role="tab" aria-selected="${isCTab('testcase')}">
        ${icon('check', 13)} Testcase
      </button>
      <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
        isCTab('result') ? 'bg-brand-surface text-brand-text shadow-xs font-semibold' : 'text-brand-muted hover:text-brand-text'
      }" data-ctab="result" role="tab" aria-selected="${isCTab('result')}">
        ${icon('terminal', 13)} Test Result
      </button>
    </div>

    <div class="flex items-center gap-2">
      <span id="console-status-label" class="text-xs font-mono ${escapeHtml(statusClass)}">${escapeHtml(statusText)}</span>
    </div>
  `;
}

export function renderTestCaseTabs(
  casesList: TestCaseItem[],
  activeCaseIdx: number,
  customInputActive: boolean,
  testResults: (boolean | null)[]
): string {
  return (
    casesList
      .map((_, idx) => {
        const res = testResults[idx];
        const dotBg = res === true ? 'bg-emerald-500' : res === false ? 'bg-rose-500' : 'bg-brand-muted/40';
        const isSelected = !customInputActive && activeCaseIdx === idx;
        const tabClasses = isSelected
          ? 'bg-brand-surface border-brand-text text-brand-text shadow-xs font-semibold'
          : 'bg-brand-surface2 border-brand-line text-brand-muted hover:text-brand-text';
        return `
          <button type="button" class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${tabClasses}" data-case="${idx}" role="tab" aria-selected="${isSelected}">
            <span class="w-1.5 h-1.5 rounded-full ${dotBg}"></span>Case ${idx + 1}
          </button>
        `;
      })
      .join('') +
    `
      <button type="button" class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
        customInputActive ? 'bg-brand-surface border-brand-text text-brand-text shadow-xs font-semibold' : 'bg-brand-surface2 border-brand-line text-brand-muted hover:text-brand-text'
      }" data-case="custom" role="tab" aria-selected="${customInputActive}">
        <span class="w-1.5 h-1.5 rounded-full bg-brand-muted/40"></span>Custom
      </button>
    `
  );
}

export function renderTestCaseBox(
  casesList: TestCaseItem[],
  activeCaseIdx: number,
  customInputActive: boolean,
  customInputValue: string
): string {
  if (customInputActive) {
    return `
      <label for="custom-input-field" class="text-[10px] font-bold tracking-wider text-brand-muted uppercase">CUSTOM INPUT (JSON OR RAW STRING)</label>
      <input id="custom-input-field" class="w-full bg-brand-surface border border-brand-line rounded-lg px-3 py-2 text-xs font-mono text-brand-text outline-none focus:border-indigo-500" value="${escapeHtml(
        customInputValue
      )}" placeholder="e.g. { &quot;nums&quot;: [2, 7, 11, 15], &quot;target&quot;: 9 }">
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

export function renderTestResultOutput(
  status: string,
  runtimeMs: number,
  isAccepted: boolean,
  inputTable: string,
  outputTable: string,
  expectedTable: string,
  diff?: string,
  error?: string
): string {
  return `
    <div class="flex flex-col gap-2.5 font-mono text-xs">
      <div class="flex items-center justify-between pb-1.5 border-b border-brand-line">
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm ${isAccepted ? 'text-emerald-500' : 'text-rose-500'}">${escapeHtml(status)}</span>
          <span class="text-xs text-brand-muted">Runtime: ${runtimeMs} ms</span>
        </div>
      </div>

      ${
        error
          ? `
      <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono whitespace-pre-wrap">
        ${escapeHtml(error)}
      </div>`
          : ''
      }

      ${
        diff
          ? `
      <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs whitespace-pre-wrap">
        ${escapeHtml(diff)}
      </div>`
          : ''
      }

      ${
        inputTable
          ? `
      <div>
        <div class="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 font-sans">Input</div>
        <pre class="p-2 rounded-lg bg-brand-surface2 border border-brand-line overflow-x-auto text-brand-text leading-snug whitespace-pre m-0">${escapeHtml(inputTable)}</pre>
      </div>`
          : ''
      }

      <div>
        <div class="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 font-sans">Output</div>
        <pre class="p-2 rounded-lg bg-brand-surface2 border border-brand-line overflow-x-auto text-brand-text leading-snug whitespace-pre m-0">${escapeHtml(outputTable)}</pre>
      </div>

      ${
        expectedTable
          ? `
      <div>
        <div class="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-1 font-sans">Expected</div>
        <pre class="p-2 rounded-lg bg-brand-surface2 border border-brand-line overflow-x-auto text-brand-text leading-snug whitespace-pre m-0">${escapeHtml(expectedTable)}</pre>
      </div>`
          : ''
      }
    </div>
  `;
}

export function buildSqlConsoleTables(
  res: { columns?: string[]; rows?: unknown[]; expected_rows?: Record<string, unknown>[] },
  tc?: TestCaseItem
): { inputTable: string; outputTable: string; expectedTable: string } {
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
  const outputTable = res.columns && res.columns.length > 0 ? formatAsciiTable(res.columns, userRows) : '(No rows returned)';

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

  return { inputTable, outputTable, expectedTable };
}

