import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';
import { indentUnit, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

export interface EditorController {
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  destroy: () => void;
  getView: () => EditorView;
}

const againTheme = EditorView.theme({
  '&': {
    height: '100%',
    width: '100%',
    backgroundColor: '#081120',
    color: '#e6ecf5',
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: '12px',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
    lineHeight: '1.6',
  },
  '.cm-content': {
    caretColor: '#34d399',
    lineHeight: '1.6',
    padding: '12px 4px',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#34d399',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#1d3557 !important',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#1e3a5f',
  },
  '.cm-gutters': {
    backgroundColor: '#081120',
    color: '#4a5873',
    borderRight: '1px solid #1b2740',
    paddingRight: '6px',
    lineHeight: '1.6',
  },
  '.cm-gutterElement': {
    padding: '0 8px',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#8d9bb3',
  },
  '.cm-tooltip': {
    backgroundColor: '#0c1626',
    border: '1px solid #25314a',
    color: '#e6ecf5',
    borderRadius: '6px',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: '#182234',
      color: '#ffffff',
    },
  },
});

const againHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#c792ea', fontWeight: 'bold' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#e6ecf5' },
  { tag: [t.function(t.variableName), t.labelName], color: '#82aaff' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#7fdbca' },
  { tag: [t.definition(t.name), t.separator], color: '#e6ecf5' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#f78c6c' },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#c792ea' },
  { tag: [t.meta, t.comment], color: '#5f7089', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: '#82aaff', textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: '#c792ea' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#f78c6c' },
  { tag: [t.processingInstruction, t.string, t.inserted], color: '#a5e075' },
  { tag: t.invalid, color: '#ff5370' },
]);

export function bindCodeEditor(
  mountContainer: HTMLElement,
  textarea: HTMLTextAreaElement,
  kind: 'sql' | 'py',
  onInput?: (val: string) => void,
  onCursorChange?: (line: number, col: number) => void
): EditorController {
  const langExtension = kind === 'sql' ? sql({ dialect: PostgreSQL }) : python();

  let isUpdatingFromTextarea = false;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !isUpdatingFromTextarea) {
      const code = update.state.doc.toString();
      textarea.value = code;
      if (onInput) {
        onInput(code);
      }
    }
    if (update.selectionSet || update.docChanged) {
      if (onCursorChange) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        onCursorChange(line.number, pos - line.from + 1);
      }
    }
  });

  const state = EditorState.create({
    doc: textarea.value,
    extensions: [
      basicSetup,
      keymap.of([indentWithTab, ...defaultKeymap]),
      indentUnit.of('    '),
      langExtension,
      againTheme,
      syntaxHighlighting(againHighlightStyle),
      updateListener,
    ],
  });

  const view = new EditorView({
    state,
    parent: mountContainer,
  });

  // Listen for external programmatic textarea inputs (e.g. from tests or reset button)
  const handleTextareaInput = () => {
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== textarea.value) {
      isUpdatingFromTextarea = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: textarea.value },
      });
      isUpdatingFromTextarea = false;
      if (onInput) {
        onInput(textarea.value);
      }
    }
  };

  textarea.addEventListener('input', handleTextareaInput);

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (val: string) => {
      isUpdatingFromTextarea = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: val },
      });
      textarea.value = val;
      isUpdatingFromTextarea = false;
      if (onInput) {
        onInput(val);
      }
    },
    focus: () => {
      view.focus();
    },
    destroy: () => {
      textarea.removeEventListener('input', handleTextareaInput);
      view.destroy();
    },
    getView: () => view,
  };
}
