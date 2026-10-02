import { highlight } from './syntax';

export interface EditorController {
  getValue: () => string;
  setValue: (value: string) => void;
  sync: () => void;
}

export function bindCodeEditor(
  textarea: HTMLTextAreaElement,
  preHighlight: HTMLElement,
  gutter: HTMLElement,
  kind: 'sql' | 'py',
  onInput?: (val: string) => void
): EditorController {
  let isTrapActive = true;

  const sync = () => {
    const code = textarea.value;
    preHighlight.innerHTML = highlight(code, kind) + '\n';
    const lines = code.split('\n').length;
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  };

  textarea.addEventListener('input', () => {
    sync();
    if (onInput) {
      onInput(textarea.value);
    }
  });

  textarea.addEventListener('scroll', () => {
    preHighlight.scrollTop = textarea.scrollTop;
    preHighlight.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  });

  textarea.addEventListener('focus', () => {
    isTrapActive = true;
  });

  const pairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    "'": "'",
    '"': '"',
    '`': '`',
  };
  const closeChars = new Set([')', ']', '}', "'", '"', '`']);

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isTrapActive = false;
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // 1. Tab and Shift+Tab indentation
    if (e.key === 'Tab' && isTrapActive) {
      e.preventDefault();
      if (!e.shiftKey) {
        if (start === end) {
          textarea.setRangeText('    ', start, end, 'end');
        } else {
          const before = value.substring(0, start);
          const lineStart = before.lastIndexOf('\n') + 1;
          const after = value.substring(end);
          const selectedText = value.substring(lineStart, end);
          const indented = selectedText.split('\n').map((l) => '    ' + l).join('\n');
          textarea.value = value.substring(0, lineStart) + indented + after;
          textarea.selectionStart = start + 4;
          textarea.selectionEnd = lineStart + indented.length;
        }
      } else {
        const before = value.substring(0, start);
        const lineStart = before.lastIndexOf('\n') + 1;
        const after = value.substring(end);
        const selectedText = value.substring(lineStart, end);
        const outdented = selectedText
          .split('\n')
          .map((l) => l.replace(/^ {1,4}/, ''))
          .join('\n');
        textarea.value = value.substring(0, lineStart) + outdented + after;
        textarea.selectionStart = Math.max(lineStart, start - 4);
        textarea.selectionEnd = lineStart + outdented.length;
      }
      textarea.dispatchEvent(new Event('input'));
      return;
    }

    // 2. Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      const match = currentLine.match(/^[ \t]+/);
      const indent = match ? match[0] : '';
      
      textarea.setRangeText('\n' + indent, start, end, 'end');
      textarea.dispatchEvent(new Event('input'));
      return;
    }

    // 3. Pair-aware backspace
    if (e.key === 'Backspace' && start === end && start > 0) {
      const charBefore = value[start - 1];
      const charAfter = value[start];
      if (pairs[charBefore] && pairs[charBefore] === charAfter) {
        e.preventDefault();
        textarea.setRangeText('', start - 1, start + 1, 'end');
        textarea.dispatchEvent(new Event('input'));
        return;
      }
    }

    // 4. Auto-closing pairs and selection wrapping
    if (pairs[e.key]) {
      const open = e.key;
      const close = pairs[open];
      if (start !== end) {
        e.preventDefault();
        const selectedText = value.substring(start, end);
        textarea.setRangeText(open + selectedText + close, start, end, 'end');
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = end + 1;
        textarea.dispatchEvent(new Event('input'));
        return;
      } else {
        if (open === close && value[start] === close) {
          e.preventDefault();
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = start + 1;
          return;
        }
        e.preventDefault();
        textarea.setRangeText(open + close, start, end, 'end');
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
        textarea.dispatchEvent(new Event('input'));
        return;
      }
    }

    // 5. Skip over closing bracket/paren if typed before it
    if (closeChars.has(e.key) && start === end && value[start] === e.key) {
      e.preventDefault();
      textarea.selectionStart = start + 1;
      textarea.selectionEnd = start + 1;
      return;
    }
  });

  sync();

  return {
    getValue: () => textarea.value,
    setValue: (val: string) => {
      textarea.value = val;
      sync();
    },
    sync,
  };
}
