import { getStudyPlanDetail } from '../api';
import { attachShellEvents, renderShell } from '../components/shell';
import { escapeHtml, icon } from '../components/icons';
import { showToast } from '../components/toast';
import { navigate } from '../router';
import type { StudyPlanDetailResponse } from '../types';

const SOLVED_STORAGE_KEY = 'again_solved_problems';

function getSolvedProblemIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SOLVED_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSolvedProblemIds(solved: Set<string>): void {
  try {
    localStorage.setItem(SOLVED_STORAGE_KEY, JSON.stringify([...solved]));
  } catch {
    // ignore
  }
}

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

  let planData: StudyPlanDetailResponse | null = null;
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
  const planCategory = planData.plan?.category || planData.language || 'SQL';
  const problems = planData.problems || [];
  const solvedSet = getSolvedProblemIds();

  function countSolved(): number {
    return problems.filter((p) => solvedSet.has(p.id || p.problemId || '') || p.solved).length;
  }

  function renderView(): void {
    const solvedCount = countSolved();
    const percent = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;
    const startBtnText = solvedCount > 0 ? 'Continue' : 'Start';

    const rowsHtml = problems
      .map((p) => {
        const pid = p.id || p.problemId || '';
        const isDone = solvedSet.has(pid) || !!p.solved;
        return `
          <div class="row" data-pid="${escapeHtml(pid)}" tabindex="0" role="link" aria-label="Open ${escapeHtml(p.title)}">
            <button type="button" class="tick ${isDone ? 'done' : ''}" data-tick="${escapeHtml(pid)}" aria-label="Mark ${escapeHtml(p.title)} as solved">
              ${isDone ? icon('check', 12) : ''}
            </button>
            <div class="rt">
              <div class="t">${escapeHtml(p.title)}</div>
              <div class="tgs">
                <span>${escapeHtml(p.difficulty)}</span>
                <span>${escapeHtml(p.language || planCategory)}</span>
              </div>
            </div>
            <button type="button" class="sol" data-sol>
              ${icon('doc', 14)}
              <span>Solution</span>
            </button>
            <span class="df ${escapeHtml(p.difficulty)}">${escapeHtml(p.difficulty)}</span>
          </div>
        `;
      })
      .join('');

    const contentHtml = `
      <div class="page">
        <div class="ph">
          <div>
            <div class="c-label">STUDY PLAN</div>
            <h1 class="pg">${escapeHtml(planTitle)}</h1>
            <p class="sub">${escapeHtml(planDesc)}</p>
          </div>
          <div class="ph-r">
            <button class="btn lg" type="button" id="share-plan-btn">${icon('share', 14)} Share</button>
            <button class="btn dark lg" type="button" id="start-plan-btn">${icon('play', 12)} <span>${startBtnText}</span></button>
          </div>
        </div>

        <div class="ph-prog">
          <div class="bar">
            <i id="plan-barfill" style="width: ${percent}%;"></i>
          </div>
          <span id="plan-prog-label">${solvedCount} of ${problems.length} solved</span>
        </div>

        <div class="tools">
          <div class="count">${problems.length} Problems</div>
          <label class="showtags">
            <input type="checkbox" id="plan-tags-toggle">
            Show tags
          </label>
        </div>

        <div class="pl" id="problem-list-container">
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
        const nextUnsolved = problems.find((p) => !solvedSet.has(p.id || p.problemId || '') && !p.solved) || problems[0];
        if (nextUnsolved) {
          const nextPid = nextUnsolved.id || nextUnsolved.problemId || '';
          navigate(`#/problem/${encodeURIComponent(nextPid)}`);
        }
      };
    }

    const tagsToggle = container.querySelector('#plan-tags-toggle') as HTMLInputElement | null;
    const plContainer = container.querySelector('#problem-list-container');
    if (tagsToggle && plContainer) {
      tagsToggle.onchange = () => {
        plContainer.classList.toggle('show', tagsToggle.checked);
      };
    }

    const rowsContainer = container.querySelector('#plan-rows');
    if (rowsContainer) {
      rowsContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        // Toggle checkbox
        const tickBtn = target.closest('[data-tick]') as HTMLButtonElement | null;
        if (tickBtn) {
          const pid = tickBtn.dataset.tick;
          if (pid) {
            if (solvedSet.has(pid)) {
              solvedSet.delete(pid);
            } else {
              solvedSet.add(pid);
            }
            saveSolvedProblemIds(solvedSet);
            renderView();
          }
          return;
        }

        // Solution click
        if (target.closest('[data-sol]')) {
          showToast('Canonical solutions can be reviewed in the editor');
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
