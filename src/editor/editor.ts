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

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isTrapActive = false;
      return;
    }
    if (e.key === 'Tab' && isTrapActive) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.setRangeText('    ', start, end, 'end');
      textarea.dispatchEvent(new Event('input'));
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
