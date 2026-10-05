/**
 * Bento Workspace Layout Scaffolding
 * Provides the clean Bento dual-pane structure, topbar, gutters, and card containers.
 */

import { escapeHtml, icon } from '../../components/icons';

export interface WorkbenchLayoutProps {
  backHref: string;
  backLabel: string;
  problemLanguage: string;
  problemTitle: string;
  splitX: number;
  splitY: number;
  langLabel: string;
  leftPanelTabsHtml: string;
  leftPanelBodyHtml: string;
  consoleHeaderHtml: string;
}

export function renderWorkbenchLayout(props: WorkbenchLayoutProps): string {
  return `
    <div class="prob flex-1 flex flex-col h-full max-h-full min-h-0 overflow-hidden w-full">
      <!-- Breadcrumb Bar -->
      <div class="prob-top h-10 flex-none flex items-center justify-between px-3 sm:px-4 bg-brand-surface border-b border-brand-line text-xs gap-3">
        <div class="crumbs flex items-center gap-2 text-brand-muted text-xs truncate">
          <a class="back inline-flex items-center gap-1 font-semibold text-brand-text hover:text-brand-muted transition-colors" href="${props.backHref}" id="crumb-back-btn">
            ${icon('left', 14)}
            ${escapeHtml(props.backLabel)}
          </a>
          <span class="text-brand-muted/40">/</span>
          <span>${escapeHtml(props.problemLanguage)}</span>
          <span class="text-brand-muted/40">/</span>
          <b class="text-brand-text font-semibold truncate">${escapeHtml(props.problemTitle)}</b>
          <span class="ready ml-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" id="execution-status-pill">READY</span>
        </div>
      </div>

      <!-- Bento Workspace Canvas -->
      <div class="bento-workspace flex-1 flex p-2 gap-2 min-h-0 h-full max-h-full overflow-hidden bg-brand-bg select-none-during-drag" id="bento-workspace">
        <!-- Left Panel: Problem Card -->
        <section id="bento-left" class="flex flex-col min-w-[280px] max-w-[80%] h-full max-h-full min-h-0 rounded-xl border border-brand-line bg-brand-surface shadow-xs overflow-hidden shrink-0" style="width: ${props.splitX}%;">
          <div class="h-10 flex items-center border-b border-brand-line px-3 bg-brand-surface2/50 shrink-0 gap-1" id="left-panel-tabs">
            ${props.leftPanelTabsHtml}
          </div>
          <div class="flex-1 min-h-0 p-5 overflow-y-auto scrollbar-thin" id="left-card-body">
            ${props.leftPanelBodyHtml}
          </div>
        </section>

        <!-- Vertical Resizer Gutter -->
        <div id="bento-col-resizer" class="w-2 shrink-0 flex items-center justify-center cursor-col-resize group select-none touch-none" title="Drag to resize panels">
          <div class="w-1 h-8 rounded-full bg-brand-line group-hover:bg-blue-500 group-hover:h-14 group-hover:w-1.5 transition-all duration-150"></div>
        </div>

        <!-- Right Stack: Editor & Console -->
        <section id="bento-right" class="flex-1 flex flex-col min-w-[320px] min-h-0 h-full max-h-full gap-2 overflow-hidden">
          <!-- Right Top Card: Code Editor -->
          <div id="bento-editor-card" class="flex flex-col min-h-[140px] max-h-[85%] rounded-xl border border-brand-line bg-[#081120] shadow-xs overflow-hidden shrink-0" style="height: ${props.splitY}%;">
            <!-- Editor Top Bar -->
            <div class="h-10 flex-none flex items-center justify-between px-3 text-xs bg-[#0c1626] border-b border-[#1b2740] gap-2">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded bg-[#182234] border border-[#25314a] text-white font-semibold text-xs flex items-center gap-1">
                  ${escapeHtml(props.langLabel)}
                </span>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#182234] text-[#8d9bb3]">Auto</span>
              </div>

              <!-- Run / Action Buttons -->
              <div class="flex items-center gap-2">
                <button type="button" class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#182234] hover:bg-[#25314a] text-white border border-[#25314a] transition-colors cursor-pointer" id="run-code-btn" title="Run code (Ctrl + ')">
                  ${icon('play', 12)} Run <kbd class="ml-1 text-[10px] text-[#8d9bb3] font-mono">Ctrl '</kbd>
                </button>
                <button type="button" class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer" id="submit-code-btn" title="Submit solution">
                  ${icon('check', 13)} Submit
                </button>

                <div class="h-4 w-px bg-[#25314a] mx-1"></div>

                <button type="button" class="p-1.5 rounded hover:bg-[#182234] text-[#8d9bb3] hover:text-white transition-colors cursor-pointer" id="editor-format-btn" title="Format code">
                  ${icon('brackets', 14)}
                </button>
                <button type="button" class="p-1.5 rounded hover:bg-[#182234] text-[#8d9bb3] hover:text-white transition-colors cursor-pointer" id="editor-reset-btn" title="Reset starter code">
                  ${icon('reset', 14)}
                </button>
              </div>
            </div>

            <!-- Editor Body -->
            <div class="ed flex-1 min-h-0 relative flex overflow-hidden font-mono text-xs">
              <div class="gut shrink-0 select-none py-3 px-2.5 text-right font-mono text-xs leading-relaxed whitespace-pre min-w-[2.5rem] text-[#4a5873] border-r border-[#1b2740] bg-[#081120] overflow-hidden" id="code-gutter" aria-hidden="true"></div>
              <div class="code flex-1 relative overflow-hidden">
                <pre id="code-highlight" class="absolute inset-0 p-3 m-0 overflow-hidden pointer-events-none font-mono text-xs leading-relaxed text-[#e6ecf5]" aria-hidden="true"></pre>
                <textarea id="code-textarea" class="absolute inset-0 p-3 m-0 w-full h-full bg-transparent resize-none border-0 outline-none font-mono text-xs leading-relaxed caret-emerald-400 scrollbar-thin" style="-webkit-text-fill-color: transparent !important; color: transparent !important;" spellcheck="false" wrap="off" autocapitalize="off" autocomplete="off" aria-label="Code editor"></textarea>
              </div>
            </div>

            <!-- Editor Bottom Status Bar -->
            <div class="h-7 flex-none flex items-center justify-between px-3 border-t border-[#1b2740] bg-[#0c1626] text-[11px] font-mono text-[#8d9bb3] select-none">
              <span class="flex items-center gap-1.5 text-emerald-400">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Saved
              </span>
              <span id="editor-cursor-pos" class="text-[#8d9bb3]">Ln 1, Col 1</span>
            </div>
          </div>

          <!-- Horizontal Resizer Gutter -->
          <div id="bento-row-resizer" class="h-2 shrink-0 flex items-center justify-center cursor-row-resize group select-none touch-none" title="Drag to resize console">
            <div class="h-1 w-8 rounded-full bg-brand-line group-hover:bg-blue-500 group-hover:w-14 group-hover:h-1.5 transition-all duration-150"></div>
          </div>

          <!-- Right Bottom Card: Testcase & Console -->
          <div id="bento-console-card" class="flex-1 flex flex-col min-h-0 rounded-xl border border-brand-line bg-brand-surface shadow-xs overflow-hidden">
            <div class="h-10 flex-none flex items-center justify-between px-3 border-b border-brand-line bg-brand-surface2/50 text-xs" id="console-header-container">
              ${props.consoleHeaderHtml}
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs scrollbar-thin" id="console-card-body"></div>
          </div>
        </section>
      </div>
    </div>
  `;
}
