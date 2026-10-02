import { getState, toggleTheme } from '../state';
import { escapeHtml, icon } from './icons';
import { showToast } from './toast';
import { navigate } from '../router';

export function renderTopbar(crumbs: string[]): string {
  const renderedCrumbs = crumbs
    .map((crumb, idx) => {
      const isLast = idx === crumbs.length - 1;
      return isLast
        ? `<b class="text-brand-text font-semibold">${escapeHtml(crumb)}</b>`
        : `<span class="hover:text-brand-text transition-colors">${escapeHtml(crumb)}</span><span class="text-brand-muted/50">/</span>`;
    })
    .join('');

  const isConnected = getState().backendConnected;
  const statusDotClass = isConnected
    ? 'w-2 h-2 rounded-full inline-block bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
    : 'w-2 h-2 rounded-full inline-block bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
  const statusLabel = isConnected ? 'API Online' : 'API Offline';

  return `
    <header class="topbar w-full h-12 flex-none flex items-center px-6 bg-brand-surface border-b border-brand-line text-xs text-brand-muted gap-2 shrink-0">
      ${renderedCrumbs}
      <div class="ml-auto flex items-center gap-2">
        <span class="${statusDotClass}" id="shell-status-dot"></span>
        <span id="shell-status-label" class="text-[11px] font-medium">${statusLabel}</span>
      </div>
    </header>
  `;
}

export function renderSidebar(activeNav: string): string {
  const navItem = (href: string, key: string, ic: string, label: string) => {
    const isCurrent = activeNav === key;
    const baseClasses = 'group flex items-center gap-3 px-2.5 py-2 my-0.5 rounded-lg text-sm font-medium border transition-all duration-150';
    const stateClasses = isCurrent
      ? 'bg-[#12213b] text-white border-emerald-500/50 shadow-xs [&>svg]:text-emerald-400 hover:bg-[#16294a] hover:border-emerald-400'
      : 'text-[#b9c5da] border-transparent hover:bg-[#12213b]/80 hover:text-white hover:border-emerald-500/30 [&>svg]:hover:text-emerald-400';
    return `
      <a href="${href}" class="${baseClasses} ${stateClasses} ${isCurrent ? 'on' : ''}" data-nav="${key}" ${isCurrent ? 'aria-current="page"' : ''}>
        ${icon(ic, 17)}
        <span class="max-[900px]:hidden">${escapeHtml(label)}</span>
      </a>
    `;
  };

  const currentTheme = getState().theme;
  const themeIcon = currentTheme === 'dark' ? icon('sun', 15) : icon('moon', 15);

  return `
    <aside class="side bg-[#081120] text-[#c9d3e4] flex flex-col p-4 min-h-0 select-none border-r border-[#1b2740] shrink-0">
      <div class="brand flex items-center gap-2 font-bold text-lg text-white px-2 pt-0.5 pb-5 tracking-tight">
        <i class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></i>
        <span class="max-[900px]:hidden">again!</span>
      </div>

      <nav class="nav flex flex-col gap-0.5" aria-label="Main Navigation">
        ${navItem('#/dashboard', 'dashboard', 'dashboard', 'Dashboard')}
        ${navItem('#/activity', 'activity', 'activity', 'My Activity')}
        <div class="grp text-[10px] font-semibold tracking-wider text-[#6c7b95] px-2.5 pt-4 pb-1 uppercase max-[900px]:hidden">LEARN</div>
        ${navItem('#/resources', 'resources', 'courses', 'Resources')}
        ${navItem('#/practice', 'practice', 'practice', 'Practice')}
        <div class="grp text-[10px] font-semibold tracking-wider text-[#6c7b95] px-2.5 pt-4 pb-1 uppercase max-[900px]:hidden">APPLY</div>
        ${navItem('#/code', 'code', 'code', 'Code')}
      </nav>

      <div class="me mt-auto flex items-center gap-2.5 px-1.5 pt-3 pb-0.5 border-t border-[#1b2740]/60">
        <div class="av w-7 h-7 rounded-full bg-[#1b2a45] text-white font-semibold text-xs flex items-center justify-center shrink-0">KM</div>
        <div class="max-[900px]:hidden min-w-0">
          <b class="block text-xs text-white leading-tight truncate">Khester</b>
          <small class="text-[11px] text-[#6c7b95] block truncate">Localhost Mode</small>
        </div>
        <button type="button" class="theme-btn ml-auto p-1.5 rounded-md text-[#7e8ca6] hover:text-white hover:bg-white/10 transition-colors" id="theme-toggle-btn" aria-label="Toggle theme">
          ${themeIcon}
        </button>
        <button type="button" class="theme-btn p-1.5 rounded-md text-[#7e8ca6] hover:text-white hover:bg-white/10 transition-colors ml-0.5" id="gear-btn" aria-label="Settings">
          ${icon('gear', 15)}
        </button>
      </div>
    </aside>
  `;
}

export function renderShell(
  activeNav: string,
  contentHtml: string,
  crumbs: string[],
  extraClass = ''
): string {
  return `
    <div class="app w-full min-w-0 h-full min-h-screen grid grid-cols-[224px_minmax(0,1fr)] max-[900px]:grid-cols-[64px_minmax(0,1fr)] overflow-hidden ${extraClass}">
      ${renderSidebar(activeNav)}
      <main class="main w-full min-w-0 flex-1 flex flex-col min-h-0 h-full overflow-y-auto bg-brand-bg text-brand-text">
        ${renderTopbar(crumbs)}
        <div class="w-full flex-1">
          ${contentHtml}
        </div>
      </main>
    </div>
  `;
}

export function attachShellEvents(container: HTMLElement): void {
  const themeBtn = container.querySelector('#theme-toggle-btn') as HTMLButtonElement | null;
  if (themeBtn) {
    themeBtn.onclick = () => {
      toggleTheme();
    };
  }

  const gearBtn = container.querySelector('#gear-btn') as HTMLButtonElement | null;
  if (gearBtn) {
    gearBtn.onclick = () => {
      showToast('Settings configuration is managed via local config');
    };
  }

  const navLinks = container.querySelectorAll<HTMLAnchorElement>('.nav a');
  navLinks.forEach((link) => {
    link.onclick = (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        navigate(href);
      }
    };
  });
}
