import { escapeHtml } from '../components/icons';

const KEYWORDS = {
  py: new Set([
    'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
    'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda',
    'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'None',
    'True', 'False', 'self',
  ]),
  sql: new Set([
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'ON',
    'GROUP', 'BY', 'ORDER', 'HAVING', 'AS', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
    'LIMIT', 'WITH', 'OVER', 'PARTITION', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'DISTINCT', 'UNION', 'ALL', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'SET', 'VALUES',
    'CREATE', 'TABLE', 'BETWEEN', 'LIKE', 'EXISTS', 'ASC', 'DESC',
  ]),
};

const BUILTINS = new Set([
  'list', 'dict', 'set', 'tuple', 'int', 'str', 'float', 'bool', 'len', 'range',
  'enumerate', 'print', 'sum', 'min', 'max', 'sorted', 'zip', 'map', 'filter', 'abs',
  'any', 'all', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE', 'IF',
  'DATE', 'RANK', 'DENSE_RANK', 'ROW_NUMBER', 'LAG', 'LEAD',
]);

export function highlight(code: string, kind: 'sql' | 'py'): string {
  const tokenRegex =
    /(--[^\n]*|#[^\n]*)|("""[\s\S]*?"""|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)/g;

  let out = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let prevToken = '';

  while ((match = tokenRegex.exec(code)) !== null) {
    out += escapeHtml(code.slice(lastIndex, match.index));
    const token = match[0];
    let cssClass = '';

    if (match[1]) {
      // Comment
      const isSqlComment = token.startsWith('--');
      if ((kind === 'sql' && isSqlComment) || (kind !== 'sql' && token.startsWith('#'))) {
        cssClass = 'c';
      }
    } else if (match[2]) {
      // String
      cssClass = 's';
    } else if (match[3]) {
      // Number
      cssClass = 'n';
    } else if (match[4]) {
      // Identifier / Keyword / Function / Builtin
      const isSql = kind === 'sql';
      const upper = token.toUpperCase();
      if ((isSql && KEYWORDS.sql.has(upper)) || (!isSql && KEYWORDS.py.has(token))) {
        cssClass = 'k';
      } else if (prevToken === 'def' || prevToken === 'class') {
        cssClass = 'f';
      } else if (BUILTINS.has(isSql ? upper : token)) {
        cssClass = 'b';
      } else if (code[match.index + token.length] === '(') {
        cssClass = 'f';
      }
      prevToken = token;
    }

    out += cssClass ? `<span class="${cssClass}">${escapeHtml(token)}</span>` : escapeHtml(token);
    lastIndex = match.index + token.length;
  }

  return out + escapeHtml(code.slice(lastIndex));
}
