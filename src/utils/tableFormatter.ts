/**
 * Formats structured tabular data into clean, aligned ASCII / Markdown monospace tables
 * and responsive HTML preview tables.
 * Matches LeetCode testcase and result presentation.
 */

import { escapeHtml } from '../components/icons';

export function formatAsciiTable(
  headers: string[],
  rows: (Record<string, unknown> | unknown[])[]
): string {
  if (!headers || headers.length === 0) {
    return '(empty)';
  }

  // Calculate maximum column widths
  const colWidths = headers.map((h) => Math.max(h.length, 3));

  const stringRows: string[][] = rows.map((row) => {
    return headers.map((h, colIdx) => {
      let val: unknown;
      if (Array.isArray(row)) {
        val = row[colIdx];
      } else if (row && typeof row === 'object') {
        val = (row as Record<string, unknown>)[h];
      }
      const str = val === null || val === undefined ? 'null' : String(val);
      if (str.length > colWidths[colIdx]) {
        colWidths[colIdx] = str.length;
      }
      return str;
    });
  });

  // Construct table lines
  const headerLine = '| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |';
  const sepLine = '| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |';

  if (stringRows.length === 0) {
    return `${headerLine}\n${sepLine}\n| (0 rows) |`;
  }

  const dataLines = stringRows.map(
    (row) => '| ' + row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') + ' |'
  );

  return [headerLine, sepLine, ...dataLines].join('\n');
}

export function formatSingleTableHtml(
  tableName: string | null,
  cols: string[],
  rows: (Record<string, unknown> | unknown[])[] | null
): string {
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
      for (let cIdx = 0; cIdx < cols.length; cIdx++) {
        const col = cols[cIdx];
        let val: unknown;
        if (Array.isArray(row)) {
          val = row[cIdx];
        } else if (row && typeof row === 'object') {
          val = (row as Record<string, unknown>)[col];
        }
        tableHtml += `<td class="px-2.5 py-1 whitespace-nowrap">${escapeHtml(String(val ?? ''))}</td>`;
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

export function formatTestCaseData(val: unknown): string {
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    // Multi-table dictionary: { tables: { TableName: { columns, rows } } }
    if (obj.tables && typeof obj.tables === 'object' && !Array.isArray(obj.tables)) {
      const tables = obj.tables as Record<string, { columns?: string[]; rows?: (Record<string, unknown> | unknown[])[] }>;
      let html = '';
      for (const [tName, tData] of Object.entries(tables)) {
        if (tData && Array.isArray(tData.columns)) {
          html += formatSingleTableHtml(tName, tData.columns, tData.rows || null);
        }
      }
      if (html) return html;
    }
    // Single table representation
    if (Array.isArray(obj.columns)) {
      const cols = obj.columns as string[];
      const tableName = typeof obj.table_name === 'string' ? obj.table_name : typeof obj.table === 'string' ? obj.table : null;
      const rows = Array.isArray(obj.rows) ? (obj.rows as (Record<string, unknown> | unknown[])[]) : null;
      return formatSingleTableHtml(tableName, cols, rows);
    }
    return `<input readonly class="w-full bg-brand-surface border border-brand-line rounded-lg px-3 py-1.5 text-xs font-mono text-brand-text outline-none" value="${escapeHtml(JSON.stringify(val))}">`;
  }
  return `<input readonly class="w-full bg-brand-surface border border-brand-line rounded-lg px-3 py-1.5 text-xs font-mono text-brand-text outline-none" value="${escapeHtml(String(val ?? ''))}">`;
}
