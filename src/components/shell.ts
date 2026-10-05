import { getState, toggleSidebar } from '../state';
import { escapeHtml, icon } from './icons';
import { openSettingsModal } from './settingsModal';
import { navigate } from '../router';
import type { BreadcrumbInput } from '../types';

export type { BreadcrumbInput, BreadcrumbItem } from '../types';

const CANONICAL_BREADCRUMB_ROUTES: Record<string, string> = {
  'practice library': '#/practice',
  'practice': '#/practice',
  'code library': '#/code',
  'code': '#/code',
  'all study plans': '#/code',
  'all topics': '#/practice',
  'dashboard': '#/dashboard',
  'home': '#/dashboard',
  'my activity': '#/activity',
  'activity': '#/activity',
  'resources': '#/resources',
  'learn': '#/resources',
};

export function renderTopbar(crumbs: BreadcrumbInput[]): string {
  const renderedCrumbs = crumbs
    .map((crumb, idx) => {
      const isLast = idx === crumbs.length - 1;
      const label = typeof crumb === 'string' ? crumb : crumb.label;
      const explicitHref = typeof crumb === 'object' ? crumb.href : undefined;
      const resolvedHref = explicitHref || CANONICAL_BREADCRUMB_ROUTES[label.toLowerCase().trim()];

      if (isLast) {
        return `
          <li class="flex items-center min-w-0">
            <b class="text-brand-text font-semibold truncate" aria-current="page">${escapeHtml(label)}</b>
          </li>
        `;
      }

      const content = resolvedHref
        ? `<a href="${resolvedHref}" class="crumb-link hover:text-brand-text hover:underline transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-0.5 truncate" data-nav-crumb>${escapeHtml(label)}</a>`
        : `<span class="hover:text-brand-text transition-colors truncate">${escapeHtml(label)}</span>`;

      return `
        <li class="flex items-center gap-2 min-w-0">
          ${content}
          <span class="text-brand-muted/40 select-none shrink-0" aria-hidden="true">/</span>
        </li>
      `;
    })
    .join('');

  return `
    <header class="topbar w-full h-12 flex-none flex items-center px-6 bg-brand-surface border-b border-brand-line text-xs text-brand-muted shrink-0">
      <nav aria-label="Breadcrumbs" class="w-full flex items-center min-w-0">
        <ol class="flex items-center gap-2 list-none p-0 m-0 min-w-0 truncate">
          ${renderedCrumbs}
        </ol>
      </nav>
    </header>
  `;
}

export function renderSidebar(activeNav: string): string {
  const isCollapsed = getState().sidebarCollapsed;

  const navItem = (href: string, key: string, ic: string, label: string) => {
    const isCurrent = activeNav === key;
    const baseClasses = isCollapsed
      ? 'group flex items-center justify-center p-2 my-0.5 rounded-lg text-sm font-medium border transition-all duration-150'
      : 'group flex items-center gap-3 px-2.5 py-2 my-0.5 rounded-lg text-sm font-medium border transition-all duration-150';
    const stateClasses = isCurrent
      ? 'bg-[#12213b] text-white border-emerald-500/50 shadow-xs [&>svg]:text-emerald-400 hover:bg-[#16294a] hover:border-emerald-400'
      : 'text-[#b9c5da] border-transparent hover:bg-[#12213b]/80 hover:text-white hover:border-emerald-500/30 [&>svg]:hover:text-emerald-400';
    return `
      <a href="${href}" class="${baseClasses} ${stateClasses} ${isCurrent ? 'on' : ''}" data-nav="${key}" title="${escapeHtml(label)}" ${isCurrent ? 'aria-current="page"' : ''}>
        ${icon(ic, 17)}
        ${isCollapsed ? '' : `<span class="max-[900px]:hidden truncate">${escapeHtml(label)}</span>`}
      </a>
    `;
  };

  const collapseIcon = isCollapsed ? icon('panelLeftOpen', 16) : icon('panelLeftClose', 16);
  const collapseTitle = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return `
    <aside class="side bg-[#081120] text-[#c9d3e4] flex flex-col ${isCollapsed ? 'p-2' : 'p-4'} min-h-0 select-none border-r border-[#1b2740] shrink-0 transition-all duration-200">
      <div class="brand flex items-center ${isCollapsed ? 'justify-center flex-col gap-3' : 'justify-between'} pt-0.5 pb-4 tracking-tight border-b border-[#1b2740]/40 mb-2">
        <div class="flex items-center gap-2 font-bold text-lg text-white ${isCollapsed ? 'px-0' : 'px-1'}">
          <i class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></i>
          ${isCollapsed ? '' : `<span class="max-[900px]:hidden font-mono tracking-tight">again!</span>`}
        </div>
        <button type="button" id="sidebar-collapse-btn" class="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#7e8ca6] hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer" title="${collapseTitle}" aria-label="${collapseTitle}">
          ${collapseIcon}
        </button>
      </div>

      <nav class="nav flex flex-col gap-0.5" aria-label="Main Navigation">
        ${navItem('#/dashboard', 'dashboard', 'dashboard', 'Dashboard')}
        ${navItem('#/activity', 'activity', 'activity', 'My Activity')}
        ${isCollapsed ? '<div class="h-2"></div>' : '<div class="grp text-[10px] font-semibold tracking-wider text-[#6c7b95] px-2.5 pt-4 pb-1 uppercase max-[900px]:hidden">LEARN</div>'}
        ${navItem('#/resources', 'resources', 'courses', 'Resources')}
        ${navItem('#/practice', 'practice', 'practice', 'Practice')}
        ${isCollapsed ? '<div class="h-2"></div>' : '<div class="grp text-[10px] font-semibold tracking-wider text-[#6c7b95] px-2.5 pt-4 pb-1 uppercase max-[900px]:hidden">APPLY</div>'}
        ${navItem('#/code', 'code', 'code', 'Code')}
      </nav>

      <div class="me mt-auto flex flex-col gap-2 pt-3 pb-0.5 border-t border-[#1b2740]/60">
        ${
          isCollapsed
            ? `
          <div class="flex flex-col items-center gap-2">
            <div class="av w-8 h-8 rounded-full bg-[#1b2a45] text-white font-semibold text-xs flex items-center justify-center shrink-0" title="Khester">KM</div>
            <button type="button" class="gear-btn p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#7e8ca6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer" id="gear-btn" title="Settings" aria-label="Settings">
              ${icon('gear', 16)}
            </button>
          </div>
        `
            : `
          <div class="flex items-center gap-2.5 px-1">
            <div class="av w-8 h-8 rounded-full bg-[#1b2a45] text-white font-semibold text-xs flex items-center justify-center shrink-0">KM</div>
            <div class="max-[900px]:hidden min-w-0">
              <b class="block text-xs text-white leading-tight truncate">Khester</b>
              <small class="text-[11px] text-[#6c7b95] block truncate">Localhost Mode</small>
            </div>
            <button type="button" class="gear-btn ml-auto p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#7e8ca6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer" id="gear-btn" title="Settings" aria-label="Settings">
              ${icon('gear', 16)}
            </button>
          </div>
        `
        }
      </div>
    </aside>
  `;
}

export function renderShell(
  activeNav: string,
  contentHtml: string,
  crumbs: BreadcrumbInput[],
  extraClass = ''
): string {
  const isCollapsed = getState().sidebarCollapsed;
  const isWorkbench = extraClass.split(/\s+/).includes('pm');
  const gridColsClass = isCollapsed
    ? 'grid-cols-[64px_minmax(0,1fr)]'
    : 'grid-cols-[224px_minmax(0,1fr)] max-[900px]:grid-cols-[64px_minmax(0,1fr)]';

  const appHeightClass = isWorkbench ? 'h-screen max-h-screen overflow-hidden' : 'h-full min-h-screen';
  const mainHeightClass = isWorkbench
    ? 'h-screen max-h-screen overflow-hidden'
    : 'overflow-y-auto';
  const contentWrapperClass = isWorkbench
    ? 'w-full flex-1 min-h-0 h-full flex flex-col overflow-hidden'
    : 'w-full flex-1';

  return `
    <div class="app w-full min-w-0 ${appHeightClass} grid ${gridColsClass} transition-[grid-template-columns] duration-200 ease-in-out ${extraClass}">
      ${renderSidebar(activeNav)}
      <main class="main w-full min-w-0 flex-1 flex flex-col min-h-0 ${mainHeightClass} bg-brand-bg text-brand-text">
        ${isWorkbench ? '' : renderTopbar(crumbs)}
        <div class="${contentWrapperClass}">
          ${contentHtml}
        </div>
      </main>
    </div>
  `;
}

export function attachShellEvents(container: HTMLElement): void {
  const collapseBtn = container.querySelector('#sidebar-collapse-btn') as HTMLButtonElement | null;
  if (collapseBtn) {
    collapseBtn.onclick = () => {
      toggleSidebar();
      const isNowCollapsed = getState().sidebarCollapsed;
      const appEl = container.closest('.app') || container.querySelector('.app');
      const sideEl = container.querySelector('aside.side') || container.closest('aside.side');
      if (appEl && sideEl) {
        const activeLink = sideEl.querySelector('.nav a.on') as HTMLAnchorElement | null;
        const activeNav = activeLink?.getAttribute('data-nav') || 'practice';
        const temp = document.createElement('div');
        temp.innerHTML = renderSidebar(activeNav);
        const newSide = temp.firstElementChild as HTMLElement;
        sideEl.replaceWith(newSide);

        if (isNowCollapsed) {
          appEl.classList.remove('grid-cols-[224px_minmax(0,1fr)]', 'max-[900px]:grid-cols-[64px_minmax(0,1fr)]');
          appEl.classList.add('grid-cols-[64px_minmax(0,1fr)]');
        } else {
          appEl.classList.remove('grid-cols-[64px_minmax(0,1fr)]');
          appEl.classList.add('grid-cols-[224px_minmax(0,1fr)]', 'max-[900px]:grid-cols-[64px_minmax(0,1fr)]');
        }

        attachShellEvents(appEl as HTMLElement);
      }
    };
  }

  const gearBtn = container.querySelector('#gear-btn') as HTMLButtonElement | null;
  if (gearBtn) {
    gearBtn.onclick = () => {
      openSettingsModal();
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

  const crumbLinks = container.querySelectorAll<HTMLAnchorElement>('.topbar a.crumb-link');
  crumbLinks.forEach((link) => {
    link.onclick = (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        navigate(href);
      }
    };
  });
}
