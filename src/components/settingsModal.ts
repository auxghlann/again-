import { getState, setState, setTheme, type Theme } from '../state';
import { getHealth } from '../api';
import { icon } from './icons';

let modalContainer: HTMLDivElement | null = null;
let keydownListener: ((e: KeyboardEvent) => void) | null = null;

export function openSettingsModal(): void {
  closeSettingsModal();

  const currentTheme = getState().theme;

  modalContainer = document.createElement('div');
  modalContainer.id = 'settings-modal-backdrop';
  modalContainer.className =
    'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 transition-opacity duration-150';
  modalContainer.setAttribute('role', 'dialog');
  modalContainer.setAttribute('aria-modal', 'true');
  modalContainer.setAttribute('aria-labelledby', 'settings-dialog-title');

  function renderModalContent(theme: Theme): string {
    const isLight = theme === 'light';
    const isDark = theme === 'dark';
    const isConnected = getState().backendConnected;
    const health = getState().healthData;

    const isApiOnline =
      isConnected &&
      (health?.api === 'online' || health?.status === 'healthy' || health?.status === 'ok');
    const isDbOnline =
      isConnected &&
      (health?.db === 'connected');
    const isRunnerOnline =
      isConnected &&
      (health?.runner === 'connected' || health?.runner_python === 'ready');

    const lightBtnClasses = isLight
      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
      : 'border-brand-line bg-brand-surface2 text-brand-muted hover:text-brand-text hover:border-brand-muted/50';

    const darkBtnClasses = isDark
      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
      : 'border-brand-line bg-brand-surface2 text-brand-muted hover:text-brand-text hover:border-brand-muted/50';

    return `
      <div class="bg-brand-surface border border-brand-line rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-brand-text font-sans transform transition-all duration-150 max-h-[90vh] flex flex-col" id="settings-dialog-card">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-brand-line bg-brand-surface2/40 flex-none">
          <div class="flex items-center gap-2">
            ${icon('gear', 17)}
            <h2 id="settings-dialog-title" class="text-sm font-bold tracking-tight text-brand-text">Workspace Settings</h2>
          </div>
          <button type="button" id="settings-close-btn" class="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-line/50 transition-colors cursor-pointer" aria-label="Close settings">
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6 overflow-y-auto flex-1">
          <!-- Theme Appearance -->
          <div>
            <label class="block text-xs font-semibold text-brand-text mb-1">Theme Appearance</label>
            <p class="text-[11px] text-brand-muted mb-3">Choose how the coding workspace and catalogs appear on your display.</p>
            <div class="grid grid-cols-2 gap-3" id="theme-selector-group" role="radiogroup" aria-label="Theme selection">
              <button type="button" id="theme-btn-light" class="flex items-center justify-center gap-2 p-3 rounded-xl border text-xs transition-colors cursor-pointer ${lightBtnClasses}" role="radio" aria-checked="${isLight}" data-theme="light">
                ${icon('sun', 16)}
                <span>Light</span>
              </button>
              <button type="button" id="theme-btn-dark" class="flex items-center justify-center gap-2 p-3 rounded-xl border text-xs transition-colors cursor-pointer ${darkBtnClasses}" role="radio" aria-checked="${isDark}" data-theme="dark">
                ${icon('moon', 16)}
                <span>Dark</span>
              </button>
            </div>
          </div>

          <!-- Shortcuts -->
          <div>
            <label class="block text-xs font-semibold text-brand-text mb-1">Editor Keyboard Shortcuts</label>
            <div class="divide-y divide-brand-line rounded-xl border border-brand-line overflow-hidden bg-brand-surface2/30 text-xs">
              <div class="flex items-center justify-between px-3.5 py-2">
                <span class="text-brand-muted">Run solution in sandbox</span>
                <kbd class="px-2 py-0.5 rounded bg-brand-surface border border-brand-line font-mono text-[11px] text-brand-text shadow-xs">Ctrl + '</kbd>
              </div>
              <div class="flex items-center justify-between px-3.5 py-2">
                <span class="text-brand-muted">Submit solution</span>
                <span class="text-[11px] text-brand-text font-semibold">Submit button</span>
              </div>
              <div class="flex items-center justify-between px-3.5 py-2">
                <span class="text-brand-muted">Close active modal</span>
                <kbd class="px-2 py-0.5 rounded bg-brand-surface border border-brand-line font-mono text-[11px] text-brand-text shadow-xs">Esc</kbd>
              </div>
            </div>
          </div>

          <!-- Environment Diagnostics -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <label class="block text-xs font-semibold text-brand-text">Environment Diagnostics</label>
                <p class="text-[11px] text-brand-muted">Live health status of API services and execution runners.</p>
              </div>
              <button type="button" id="refresh-diagnostics-btn" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-line bg-brand-surface2/50 text-[11px] font-medium text-brand-muted hover:text-brand-text hover:border-brand-muted/40 transition-colors cursor-pointer" title="Refresh health diagnostics">
                ${icon('reset', 11)}
              </button>
            </div>
            <div class="space-y-2">
              <!-- Backend API Service -->
              <div class="p-3 rounded-xl border border-brand-line bg-brand-surface2/30 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full ${isApiOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}"></span>
                  <div>
                    <div class="text-brand-text font-medium leading-none">FastAPI Backend Service</div>
                    <div class="text-[10px] text-brand-muted mt-0.5">Port 8000 / REST &amp; Healthz</div>
                  </div>
                </div>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded ${isApiOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}">
                  ${isApiOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <!-- Database Engine -->
              <div class="p-3 rounded-xl border border-brand-line bg-brand-surface2/30 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full ${isDbOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}"></span>
                  <div>
                    <div class="text-brand-text font-medium leading-none">Application Database</div>
                    <div class="text-[10px] text-brand-muted mt-0.5">PostgreSQL 16 &amp; SQLAlchemy</div>
                  </div>
                </div>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded ${isDbOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}">
                  ${isDbOnline ? 'Connected' : 'Offline'}
                </span>
              </div>

              <!-- Execution Runner Sandbox -->
              <div class="p-3 rounded-xl border border-brand-line bg-brand-surface2/30 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2.5">
                  <span class="w-2 h-2 rounded-full ${isRunnerOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}"></span>
                  <div>
                    <div class="text-brand-text font-medium leading-none">Execution Runner Sandbox</div>
                    <div class="text-[10px] text-brand-muted mt-0.5">PostgreSQL Sandbox &amp; Python Engine</div>
                  </div>
                </div>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded ${isRunnerOnline ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}">
                  ${isRunnerOnline ? 'Ready' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3.5 border-t border-brand-line bg-brand-surface2/40 flex justify-end flex-none">
          <button type="button" id="settings-done-btn" class="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0e1a2c] dark:bg-white text-white dark:text-[#0e1a2c] hover:opacity-90 transition-opacity cursor-pointer">
            Done
          </button>
        </div>
      </div>
    `;
  }

  function attachModalEvents(): void {
    if (!modalContainer) return;

    // Backdrop click dismisses
    modalContainer.onclick = (e) => {
      if (e.target === modalContainer) {
        closeSettingsModal();
      }
    };

    const closeBtn = modalContainer.querySelector('#settings-close-btn') as HTMLButtonElement | null;
    if (closeBtn) closeBtn.onclick = () => closeSettingsModal();

    const doneBtn = modalContainer.querySelector('#settings-done-btn') as HTMLButtonElement | null;
    if (doneBtn) doneBtn.onclick = () => closeSettingsModal();

    const lightBtn = modalContainer.querySelector('#theme-btn-light') as HTMLButtonElement | null;
    const darkBtn = modalContainer.querySelector('#theme-btn-dark') as HTMLButtonElement | null;

    if (lightBtn) {
      lightBtn.onclick = () => {
        setTheme('light');
        if (modalContainer) {
          modalContainer.innerHTML = renderModalContent('light');
          attachModalEvents();
        }
      };
    }

    if (darkBtn) {
      darkBtn.onclick = () => {
        setTheme('dark');
        if (modalContainer) {
          modalContainer.innerHTML = renderModalContent('dark');
          attachModalEvents();
        }
      };
    }

    const refreshBtn = modalContainer.querySelector('#refresh-diagnostics-btn') as HTMLButtonElement | null;
    if (refreshBtn) {
      refreshBtn.onclick = async () => {
        refreshBtn.disabled = true;
        refreshBtn.classList.add('opacity-50', 'pointer-events-none');
        try {
          const res = await getHealth();
          const isHealthy = res.status === 'healthy' || res.status === 'ok';
          setState({ backendConnected: isHealthy, healthData: res });
        } catch {
          setState({ backendConnected: false, healthData: null });
        } finally {
          if (modalContainer) {
            modalContainer.innerHTML = renderModalContent(getState().theme);
            attachModalEvents();
          }
        }
      };
    }
  }

  modalContainer.innerHTML = renderModalContent(currentTheme);
  document.body.appendChild(modalContainer);
  attachModalEvents();

  // Escape key listener
  keydownListener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSettingsModal();
    }
  };
  window.addEventListener('keydown', keydownListener);

  // Fresh background check to update modal immediately with live status
  getHealth()
    .then((res) => {
      const isHealthy = res.status === 'healthy' || res.status === 'ok';
      setState({ backendConnected: isHealthy, healthData: res });
      if (modalContainer) {
        modalContainer.innerHTML = renderModalContent(getState().theme);
        attachModalEvents();
      }
    })
    .catch(() => {
      setState({ backendConnected: false, healthData: null });
      if (modalContainer) {
        modalContainer.innerHTML = renderModalContent(getState().theme);
        attachModalEvents();
      }
    });
}

export function closeSettingsModal(): void {
  if (keydownListener) {
    window.removeEventListener('keydown', keydownListener);
    keydownListener = null;
  }
  if (modalContainer && modalContainer.parentElement) {
    modalContainer.parentElement.removeChild(modalContainer);
    modalContainer = null;
  }
}

