import { getStudyPlanDetail, toggleProblemSolved } from '../api';
import { attachShellEvents, renderShell } from '../components/shell';
import { escapeHtml, icon } from '../components/icons';
import { showToast } from '../components/toast';
import { navigate } from '../router';
import { getPlanFilter, getPlanSort, setPlanFilter, setPlanSort, setState } from '../state';
import type { StudyPlanDetailResponse } from '../types';

export async function renderPlanView(container: HTMLElement, planId: string): Promise<void> {
  // Show loading state
  container.innerHTML = renderShell(
    'code',
    `
      <div class="page">
        <div class="empty">Loading study plan details...</div>
      </div>
    `,
    ['Code Library', 'Loading...']
  );
  attachShellEvents(container);

  let planData: StudyPlanDetailResponse;
  try {
    planData = await getStudyPlanDetail(planId);
  } catch {
    container.innerHTML = renderShell(
      'code',
      `
        <div class="page">
          <div class="empty">
            <h2>Study plan not found</h2>
            <p class="sub">Could not locate plan "${escapeHtml(planId)}".</p>
            <div style="margin-top: 18px;">
              <a class="btn dark lg" href="#/code">Back to Code Library</a>
            </div>
          </div>
        </div>
      `,
      ['Code Library', 'Not Found']
    );
    attachShellEvents(container);
    return;
  }

  const planTitle = planData.plan?.title || planData.title;
  const planDesc = planData.plan?.description || planData.subtitle || planData.title;
  const problems = planData.problems || [];

  let activeFilter = getPlanFilter(planId);
  let activeSort = getPlanSort(planId);

  const difficultyWeights: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  function countSolved(): number {
    return problems.filter((p) => !!p.solved).length;
  }

  function getFilteredAndSortedProblems() {
    let list = [...problems];

    // Filter
    if (activeFilter === 'unsolved') {
      list = list.filter((p) => !p.solved);
    } else if (activeFilter === 'solved') {
      list = list.filter((p) => !!p.solved);
    } else if (activeFilter === 'easy') {
      list = list.filter((p) => p.difficulty?.toLowerCase() === 'easy');
    } else if (activeFilter === 'medium') {
      list = list.filter((p) => p.difficulty?.toLowerCase() === 'medium');
    } else if (activeFilter === 'hard') {
      list = list.filter((p) => p.difficulty?.toLowerCase() === 'hard');
    }

    // Sort
    if (activeSort === 'difficulty-asc') {
      list.sort(
        (a, b) =>
          (difficultyWeights[a.difficulty?.toLowerCase() || ''] || 2) -
          (difficultyWeights[b.difficulty?.toLowerCase() || ''] || 2)
      );
    } else if (activeSort === 'difficulty-desc') {
      list.sort(
        (a, b) =>
          (difficultyWeights[b.difficulty?.toLowerCase() || ''] || 2) -
          (difficultyWeights[a.difficulty?.toLowerCase() || ''] || 2)
      );
    } else if (activeSort === 'title-asc') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (activeSort === 'title-desc') {
      list.sort((a, b) => b.title.localeCompare(a.title));
    } else if (activeSort === 'status') {
      list.sort((a, b) => (a.solved ? 1 : 0) - (b.solved ? 1 : 0));
    }

    return list;
  }

  function renderView(): void {
    const solvedCount = countSolved();
    const percent = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;
    const startBtnText = solvedCount > 0 ? 'Continue' : 'Start';

    const visibleProblems = getFilteredAndSortedProblems();
    const countLabel =
      activeFilter === 'all'
        ? `${problems.length} Problems`
        : `${visibleProblems.length} of ${problems.length} Problems`;

    const rowsHtml = visibleProblems.length
      ? visibleProblems
          .map((p) => {
            const pid = p.id || p.problemId || '';
            const isDone = !!p.solved;
            const diffColor =
              p.difficulty === 'Easy'
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                : p.difficulty === 'Medium'
                ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10'
                : 'text-rose-700 dark:text-rose-400 bg-rose-500/10';

            return `
              <div class="row flex items-center gap-3.5 px-5 min-h-[58px] cursor-pointer hover:bg-brand-surface2/80 transition-colors" data-pid="${escapeHtml(pid)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(p.title)}">
                <button type="button" class="tick shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-brand-muted/40 hover:border-brand-muted bg-transparent text-transparent'} ${isDone ? 'done' : ''}" data-tick="${escapeHtml(pid)}" aria-label="Mark ${escapeHtml(p.title)} as solved">
                  ${isDone ? icon('check', 12) : ''}
                </button>
                <div class="rt flex-1 min-w-0">
                  <div class="t text-sm font-semibold text-brand-text truncate">${escapeHtml(p.title)}</div>
                </div>
                <span class="df text-[11px] font-semibold px-2.5 py-0.5 rounded capitalize ${diffColor} ${escapeHtml(p.difficulty)}">${escapeHtml(p.difficulty)}</span>
              </div>
            `;
          })
          .join('')
      : `<div class="p-10 text-center text-sm text-brand-muted bg-brand-surface">No problems match the selected filter.</div>`;

    const contentHtml = `
      <div class="page p-6 max-w-5xl mx-auto w-full">
        <div class="ph flex justify-between items-end gap-4 flex-wrap mb-4">
          <div>
            <div class="c-label text-[10px] font-semibold tracking-wider text-brand-muted uppercase">STUDY PLAN</div>
            <h1 class="pg text-2xl font-bold tracking-tight text-brand-text mt-0.5">${escapeHtml(planTitle)}</h1>
            <p class="sub text-sm text-brand-muted mt-1">${escapeHtml(planDesc)}</p>
          </div>
          <div class="ph-r flex items-center gap-2">
            <button class="btn lg inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-brand-surface text-brand-text border border-brand-line hover:bg-brand-surface2 transition-colors" type="button" id="share-plan-btn">${icon('share', 14)} Share</button>
            <button class="btn dark lg inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0e1a2c] dark:bg-white text-white dark:text-[#0e1a2c] hover:opacity-90 transition-opacity" type="button" id="start-plan-btn">${icon('play', 12)} <span>${startBtnText}</span></button>
          </div>
        </div>

        <div class="ph-prog flex items-center gap-3 my-4 text-xs text-brand-muted">
          <div class="bar flex-1 max-w-xs h-1.5 bg-brand-line rounded-full overflow-hidden">
            <i id="plan-barfill" class="block h-full bg-emerald-500 transition-all duration-300" style="width: ${percent}%;"></i>
          </div>
          <span id="plan-prog-label" class="font-medium">${solvedCount} of ${problems.length} solved</span>
        </div>

        <div class="tools flex items-center justify-between gap-3 flex-wrap my-4">
          <div class="count text-xs font-semibold text-brand-text" id="plan-count">${countLabel}</div>
          <div class="tools-r flex items-center gap-2.5 flex-wrap">
            <label class="sel flex items-center gap-1.5 bg-brand-surface border border-brand-line rounded-lg px-2.5 h-8 text-xs text-brand-muted">
              <span>Filter:</span>
              <select id="plan-filter-sel" class="bg-transparent border-0 outline-none text-xs font-semibold text-brand-text cursor-pointer pr-1" aria-label="Filter problems">
                <option value="all" ${activeFilter === 'all' ? 'selected' : ''}>All</option>
                <option value="unsolved" ${activeFilter === 'unsolved' ? 'selected' : ''}>Unsolved</option>
                <option value="solved" ${activeFilter === 'solved' ? 'selected' : ''}>Solved</option>
                <option value="easy" ${activeFilter === 'easy' ? 'selected' : ''}>Easy</option>
                <option value="medium" ${activeFilter === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="hard" ${activeFilter === 'hard' ? 'selected' : ''}>Hard</option>
              </select>
            </label>

            <label class="sel flex items-center gap-1.5 bg-brand-surface border border-brand-line rounded-lg px-2.5 h-8 text-xs text-brand-muted">
              <span>Sort:</span>
              <select id="plan-sort-sel" class="bg-transparent border-0 outline-none text-xs font-semibold text-brand-text cursor-pointer pr-1" aria-label="Sort problems">
                <option value="default" ${activeSort === 'default' ? 'selected' : ''}>Default</option>
                <option value="difficulty-asc" ${activeSort === 'difficulty-asc' ? 'selected' : ''}>Difficulty (Easy &rarr; Hard)</option>
                <option value="difficulty-desc" ${activeSort === 'difficulty-desc' ? 'selected' : ''}>Difficulty (Hard &rarr; Easy)</option>
                <option value="title-asc" ${activeSort === 'title-asc' ? 'selected' : ''}>Title (A &rarr; Z)</option>
                <option value="title-desc" ${activeSort === 'title-desc' ? 'selected' : ''}>Title (Z &rarr; A)</option>
                <option value="status" ${activeSort === 'status' ? 'selected' : ''}>Status (Unsolved first)</option>
              </select>
            </label>
          </div>
        </div>

        <div class="pl bg-brand-surface border border-brand-line rounded-xl overflow-hidden mt-4 divide-y divide-brand-line shadow-xs" id="problem-list-container">
          <div id="plan-rows">${rowsHtml}</div>
        </div>
      </div>
    `;

    container.innerHTML = renderShell('code', contentHtml, ['Code Library', planTitle]);
    attachShellEvents(container);

    // Event attachments
    const shareBtn = container.querySelector('#share-plan-btn') as HTMLButtonElement | null;
    if (shareBtn) {
      shareBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast('Link copied to clipboard');
        } catch {
          showToast('Copy URL from your address bar');
        }
      };
    }

    const startBtn = container.querySelector('#start-plan-btn') as HTMLButtonElement | null;
    if (startBtn) {
      startBtn.onclick = () => {
        const nextUnsolved = problems.find((p) => !p.solved) || problems[0];
        if (nextUnsolved) {
          const nextPid = nextUnsolved.id || nextUnsolved.problemId || '';
          navigate(`#/problem/${encodeURIComponent(nextPid)}`);
        }
      };
    }

    const filterSel = container.querySelector('#plan-filter-sel') as HTMLSelectElement | null;
    if (filterSel) {
      filterSel.onchange = () => {
        activeFilter = filterSel.value as typeof activeFilter;
        setPlanFilter(planId, activeFilter);
        renderView();
      };
    }

    const sortSel = container.querySelector('#plan-sort-sel') as HTMLSelectElement | null;
    if (sortSel) {
      sortSel.onchange = () => {
        activeSort = sortSel.value as typeof activeSort;
        setPlanSort(planId, activeSort);
        renderView();
      };
    }

    const rowsContainer = container.querySelector('#plan-rows');
    if (rowsContainer) {
      rowsContainer.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;

        // Toggle checkbox
        const tickBtn = target.closest('[data-tick]') as HTMLButtonElement | null;
        if (tickBtn) {
          const pid = tickBtn.dataset.tick;
          if (pid) {
            tickBtn.disabled = true;
            try {
              const res = await toggleProblemSolved(pid);
              const prob = problems.find((p) => (p.id || p.problemId) === pid);
              if (prob) {
                prob.solved = res.solved;
              }
              setState({ studyPlans: [] });
              renderView();
              showToast(res.solved ? 'Marked as completed' : 'Marked as incomplete');
            } catch {
              tickBtn.disabled = false;
              showToast('Failed to update problem status');
            }
          }
          return;
        }

        // Row navigation
        const row = target.closest('.row') as HTMLElement | null;
        if (row && row.dataset.pid) {
          navigate(`#/problem/${encodeURIComponent(row.dataset.pid)}`);
        }
      });
    }
  }

  renderView();
}
