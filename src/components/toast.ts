import { escapeHtml } from './icons';

let toastTimeout: number | undefined;

export function showToast(msg: string, actionLabel?: string, onAction?: () => void): void {
  let toastElement = document.getElementById('toast');
  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.id = 'toast';
    toastElement.setAttribute('role', 'status');
    toastElement.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastElement);
  }

  const actionButtonHtml = actionLabel
    ? `<button type="button">${escapeHtml(actionLabel)}</button>`
    : '';

  toastElement.innerHTML = `<span>${escapeHtml(msg)}</span>${actionButtonHtml}`;

  if (actionLabel && onAction) {
    const btn = toastElement.querySelector('button');
    if (btn) {
      btn.onclick = () => {
        toastElement?.classList.remove('show');
        onAction();
      };
    }
  }

  toastElement.classList.add('show');

  if (toastTimeout !== undefined) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = window.setTimeout(() => {
    toastElement?.classList.remove('show');
  }, 4200);
}
