/**
 * Formats structured tabular data into clean, aligned ASCII / Markdown monospace tables.
 * Perfectly matches LeetCode testcase and result presentation.
 */

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
