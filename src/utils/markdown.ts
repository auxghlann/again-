import { escapeHtml } from '../components/icons';

/**
 * Parses inline markdown: bold, italic, and inline code.
 */
function parseInline(text: string): string {
  // Inline code: `code`
  let out = text.replace(/`([^`]+)`/g, (_m, code) => {
    return `<code class="px-1.5 py-0.5 rounded bg-brand-surface2 border border-brand-line font-mono text-[11px] text-brand-text">${escapeHtml(code)}</code>`;
  });

  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, bold) => {
    return `<strong class="font-semibold text-brand-text">${escapeHtml(bold)}</strong>`;
  });

  // Italic: *text* (when not preceded or followed by another asterisk)
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_m, italic) => {
    return `<em class="italic text-brand-text">${escapeHtml(italic)}</em>`;
  });

  return out;
}

/**
 * Checks if a block represents a markdown or ASCII table and renders it as an HTML table.
 */
function tryParseTable(block: string): string | null {
  const lines = block.trim().split('\n').map((l) => l.trim());
  if (lines.length < 2) return null;

  // Find contiguous lines that look like table rows
  const tableLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('|') && l.endsWith('|') && l.length > 2) {
      tableLineIndices.push(i);
    } else if (l.startsWith('+') && l.includes('-') && l.endsWith('+')) {
      tableLineIndices.push(i);
    }
  }

  if (tableLineIndices.length < 2) return null;

  // Preceding and trailing non-table lines in the same block
  const firstTableIdx = tableLineIndices[0];
  const lastTableIdx = tableLineIndices[tableLineIndices.length - 1];
  const preText = lines.slice(0, firstTableIdx).join('\n');
  const tableLines = lines.slice(firstTableIdx, lastTableIdx + 1);
  const postText = lines.slice(lastTableIdx + 1).join('\n');

  // Filter out pure separator lines like +---+---+ or |---|---|
  const dataLines = tableLines.filter((l) => {
    return !/^(\+[-+]+\+|\|[-:| ]+\|)$/.test(l);
  });

  if (dataLines.length === 0) return null;

  // Extract cell values from each row
  const rows = dataLines.map((l) => {
    const content = l.replace(/^\|/, '').replace(/\|$/, '');
    return content.split('|').map((c) => c.trim());
  });

  if (rows.length === 0 || rows[0].length === 0) return null;

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);

  const theadHtml = `
    <thead class="bg-brand-surface2 border-b border-brand-line text-brand-muted font-semibold">
      <tr>
        ${headerRow.map((h) => `<th class="px-3 py-2">${escapeHtml(h)}</th>`).join('')}
      </tr>
    </thead>
  `;

  const tbodyHtml = `
    <tbody class="divide-y divide-brand-line text-brand-text">
      ${bodyRows
        .map(
          (row) => `
        <tr class="hover:bg-brand-surface2/40 transition-colors">
          ${row.map((cell) => `<td class="px-3 py-1.5 whitespace-nowrap">${parseInline(cell)}</td>`).join('')}
        </tr>`
        )
        .join('')}
    </tbody>
  `;

  const tableHtml = `
    <div class="my-3 overflow-x-auto rounded-lg border border-brand-line bg-brand-surface shadow-xs">
      <table class="w-full text-left text-xs font-mono">
        ${theadHtml}
        ${tbodyHtml}
      </table>
    </div>
  `;

  let result = '';
  if (preText) {
    result += `<p class="my-2 leading-relaxed text-brand-text text-sm">${parseInline(preText).replace(/\n/g, '<br>')}</p>`;
  }
  result += tableHtml;
  if (postText) {
    result += `<p class="my-2 leading-relaxed text-brand-text text-sm">${parseInline(postText).replace(/\n/g, '<br>')}</p>`;
  }
  return result;
}

/**
 * Parses and formats markdown text into semantic HTML with Tailwind styling.
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';

  const text = markdown.replace(/\r\n/g, '\n');
  const parts = text.split(/(```[\s\S]*?```|\n\n+)/);

  const rendered = parts.map((rawBlock) => {
    const trimmed = rawBlock.trim();
    if (!trimmed) return '';

    // Code fence block
    if (trimmed.startsWith('```')) {
      const codeLines = trimmed.split('\n');
      const cleanLines = codeLines.slice(1, -1);
      const codeContent = cleanLines.join('\n');
      return `<pre class="my-2 p-3 bg-brand-surface2 border border-brand-line rounded-lg font-mono text-xs overflow-x-auto text-brand-text leading-relaxed"><code>${escapeHtml(codeContent)}</code></pre>`;
    }

    // Try parsing as table (Markdown or ASCII)
    const tableHtml = tryParseTable(trimmed);
    if (tableHtml) {
      return tableHtml;
    }

    const blockLines = trimmed.split('\n');

    // Headings
    const hMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const headingText = parseInline(hMatch[2]);
      if (level === 1) return `<h1 class="text-xl font-bold tracking-tight text-brand-text mt-4 mb-2">${headingText}</h1>`;
      if (level === 2) return `<h2 class="text-base font-bold tracking-tight text-brand-text mt-4 mb-2">${headingText}</h2>`;
      return `<h3 class="text-xs font-bold uppercase tracking-wider text-brand-muted mt-3 mb-1.5">${headingText}</h3>`;
    }

    // Bullet list
    if (blockLines.every((l) => /^[-*]\s+/.test(l.trim()))) {
      const items = blockLines.map((l) => `<li>${parseInline(l.trim().replace(/^[-*]\s+/, ''))}</li>`).join('');
      return `<ul class="list-disc list-inside space-y-1 my-2 text-brand-text text-sm">${items}</ul>`;
    }

    // Ordered list
    if (blockLines.every((l) => /^\d+\.\s+/.test(l.trim()))) {
      const items = blockLines.map((l) => `<li>${parseInline(l.trim().replace(/^\d+\.\s+/, ''))}</li>`).join('');
      return `<ol class="list-decimal list-inside space-y-1 my-2 text-brand-text text-sm">${items}</ol>`;
    }

    // Regular paragraph
    return `<p class="my-2 leading-relaxed text-brand-text text-sm">${parseInline(trimmed).replace(/\n/g, '<br>')}</p>`;
  });

  return rendered.filter(Boolean).join('\n');
}
