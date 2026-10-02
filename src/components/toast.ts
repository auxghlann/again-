import { escapeHtml } from './icons';

let toastTimeout: number | undefined;

export function showToast(msg: string, actionLabel?: string, onAction?: () => void): void {
  let toastElement = document.getElementById('toast');
  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.id = 'toast';
    toastElement.setAttribute('role', 'status');
    toastElement.setAttribute('aria-live', 'polite');
    toastElement.className =
      'fixed left-1/2 -translate-x-1/2 bottom-5 z-50 flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl bg-[#0e1a2c] text-white text-xs shadow-2xl transition-all duration-200 pointer-events-none opacity-0 translate-y-4 max-w-[92vw] border border-[#25314a]';
    document.body.appendChild(toastElement);
  }

  const actionButtonHtml = actionLabel
    ? `<button type="button" class="ml-2 bg-white text-[#0e1a2c] border-0 rounded-md font-semibold text-xs px-2.5 py-1 hover:bg-white/90 transition-colors">${escapeHtml(actionLabel)}</button>`
    : '';

  toastElement.innerHTML = `<span>${escapeHtml(msg)}</span>${actionButtonHtml}`;

  if (actionLabel && onAction) {
    const btn = toastElement.querySelector('button');
    if (btn) {
      btn.onclick = () => {
        toastElement?.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
        toastElement?.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
        onAction();
      };
    }
  }

  toastElement.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  toastElement.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');

  if (toastTimeout !== undefined) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = window.setTimeout(() => {
    toastElement?.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
    toastElement?.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
  }, 4200);
}
