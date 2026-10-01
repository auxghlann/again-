import { getState, toggleTheme } from '../state';
import { escapeHtml, icon } from './icons';
import { showToast } from './toast';
import { navigate } from '../router';

export function renderTopbar(crumbs: string[]): string {
  const renderedCrumbs = crumbs
    .map((crumb, idx) => {
      const isLast = idx === crumbs.length - 1;
      return isLast
        ? `<b>${escapeHtml(crumb)}</b>`
        : `<span>${escapeHtml(crumb)}</span><span>/</span>`;
    })
    .join('');

  const isConnected = getState().backendConnected;
  const statusDotClass = isConnected ? 'dot ok' : 'dot bad';
  const statusLabel = isConnected ? 'API Online' : 'API Offline';

  return `
    <header class="topbar">
      ${renderedCrumbs}
      <div style="margin-left: auto; display: flex; align-items: center; gap: 7px;">
        <span class="${statusDotClass}" id="shell-status-dot"></span>
        <span id="shell-status-label" style="font-size: 11px;">${statusLabel}</span>
      </div>
    </header>
  `;
}

export function renderSidebar(activeNav: string): string {
  const navItem = (href: string, key: string, ic: string, label: string) => {
    const isCurrent = activeNav === key;
    return `
      <a href="${href}" class="${isCurrent ? 'on' : ''}" data-nav="${key}" ${isCurrent ? 'aria-current="page"' : ''}>
        ${icon(ic, 17)}
        <span>${escapeHtml(label)}</span>
      </a>
    `;
  };

  const currentTheme = getState().theme;
  const themeIcon = currentTheme === 'dark' ? icon('sun', 15) : icon('moon', 15);

  return `
    <aside class="side">
      <div class="brand">
        <i></i>
        <span>again!</span>
      </div>

      <nav class="nav" aria-label="Main Navigation">
        ${navItem('#/dashboard', 'dashboard', 'dashboard', 'Dashboard')}
        ${navItem('#/activity', 'activity', 'activity', 'My Activity')}
        <div class="grp">LEARN</div>
        ${navItem('#/resources', 'resources', 'courses', 'Resources')}
        ${navItem('#/practice', 'practice', 'practice', 'Practice')}
        <div class="grp">APPLY</div>
        ${navItem('#/code', 'code', 'code', 'Code')}
      </nav>

      <div class="me">
        <div class="av">KM</div>
        <div>
          <b>Khester</b>
          <small>Localhost Mode</small>
        </div>
        <button type="button" class="theme-btn" id="theme-toggle-btn" aria-label="Toggle theme">
          ${themeIcon}
        </button>
        <button type="button" class="theme-btn" id="gear-btn" aria-label="Settings" style="margin-left: 2px;">
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
    <div class="app ${extraClass}">
      ${renderSidebar(activeNav)}
      <main class="main">
        ${renderTopbar(crumbs)}
        ${contentHtml}
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
