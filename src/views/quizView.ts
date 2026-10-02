import { getQuizDetail, resetQuizProgress, upsertQuizProgress } from '../api';
import { attachShellEvents, renderShell } from '../components/shell';
import { escapeHtml, icon } from '../components/icons';
import { navigate } from '../router';
import type { QuizDetailResponse, QuizQuestionItem } from '../types';

export async function renderQuizView(container: HTMLElement, topicId: string): Promise<void> {
  // Show initial loading skeleton
  container.innerHTML = renderShell(
    'practice',
    `
      <div class="page qz-page">
        <div class="empty">Loading practice session questions...</div>
      </div>
    `,
    ['Practice Library', 'Loading...']
  );
  attachShellEvents(container);

  let quizData: QuizDetailResponse | null = null;
  try {
    quizData = await getQuizDetail(topicId);
  } catch {
    container.innerHTML = renderShell(
      'practice',
      `
        <div class="page qz-page">
          <div class="qz-card qz-result">
            <h2 style="font-size: 19px;">Practice session not found</h2>
            <p class="sub">Could not load the requested practice quiz.</p>
            <div class="btnrow">
              <a class="btn dark lg" href="#/practice">Return to Practice Library</a>
            </div>
          </div>
        </div>
      `,
      ['Practice Library', 'Not Found']
    );
    attachShellEvents(container);
    return;
  }

  const { card, questions } = quizData;
  const total = questions.length;

  function checkCorrectness(q: QuizQuestionItem, val: string): boolean {
    if (q.type === 'mcq') {
      if (typeof q.correct === 'number' && q.options) {
        return val === q.options[q.correct];
      }
      return val.trim().toLowerCase() === String(q.answer || '').trim().toLowerCase();
    }
    if (q.type === 'tf') {
      if (typeof q.correct === 'boolean') {
        return (val.toLowerCase() === 'true') === q.correct;
      }
      return val.trim().toLowerCase() === String(q.answer || '').trim().toLowerCase();
    }
    return val.trim().toLowerCase() === String(q.answer || '').trim().toLowerCase();
  }

  // Local answers cache: maps question index to { value, correct }
  const localAnswers: Record<number, { value: string; correct: boolean }> = {};
  if (quizData.progress && quizData.progress.answers) {
    for (const [k, v] of Object.entries(quizData.progress.answers)) {
      const idx = parseInt(k, 10);
      if (!isNaN(idx) && questions[idx]) {
        const q = questions[idx];
        const isCorrect = checkCorrectness(q, String(v));
        localAnswers[idx] = { value: String(v), correct: isCorrect };
      }
    }
  }

  // Find first unanswered question index
  let currentIndex = 0;
  for (let idx = 0; idx < total; idx++) {
    if (!localAnswers[idx]) {
      currentIndex = idx;
      break;
    }
  }

  let isDone = quizData.progress?.isCompleted || Object.keys(localAnswers).length >= total;

  function scoreOf(): number {
    return Object.values(localAnswers).filter((a) => a.correct).length;
  }

  function renderResult(): void {
    const score = scoreOf();
    const contentHtml = `
      <div class="page qz-page p-6 max-w-xl mx-auto w-full">
        <div class="qz-card qz-result bg-brand-surface border border-brand-line rounded-2xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center">
          <div class="c-label text-[10px] font-bold tracking-wider text-emerald-500 uppercase">COMPLETED</div>
          <div class="qz-score text-5xl font-extrabold tracking-tight text-brand-text my-3">${score}/${total}</div>
          <p class="sub text-sm text-brand-muted max-w-md">You got ${score} out of ${total} questions right on "${escapeHtml(card.title)}".</p>
          <div class="btnrow flex items-center justify-center gap-3 mt-6">
            <button type="button" class="btn lg inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-brand-surface border border-brand-line text-brand-text hover:bg-brand-surface2 transition-colors" id="quiz-retry-btn">Retry</button>
            <a class="btn dark lg inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0e1a2c] dark:bg-white text-white dark:text-[#0e1a2c] hover:opacity-90 transition-opacity" href="#/practice" id="quiz-back-btn">Back to Practice</a>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = renderShell('practice', contentHtml, [
      'Practice Library',
      card.topic,
      card.title,
    ]);
    attachShellEvents(container);

    const retryBtn = container.querySelector('#quiz-retry-btn') as HTMLButtonElement | null;
    if (retryBtn) {
      retryBtn.onclick = async () => {
        try {
          await resetQuizProgress(topicId);
        } catch {
          // ignore
        }
        for (const key of Object.keys(localAnswers)) {
          delete localAnswers[parseInt(key, 10)];
        }
        isDone = false;
        currentIndex = 0;
        renderQuestion();
      };
    }

    const backBtn = container.querySelector('#quiz-back-btn') as HTMLAnchorElement | null;
    if (backBtn) {
      backBtn.onclick = (e) => {
        e.preventDefault();
        navigate('#/practice');
      };
    }
  }

  function renderQuestion(): void {
    const q: QuizQuestionItem = questions[currentIndex];
    const saved = localAnswers[currentIndex];
    const isChecked = !!saved;
    const answeredCount = Object.keys(localAnswers).length;
    const typeLabel =
      q.type === 'mcq'
        ? 'MULTIPLE CHOICE'
        : q.type === 'tf'
        ? 'TRUE OR FALSE'
        : 'FILL IN THE BLANK';

    let picked: string | null = isChecked ? saved.value : null;

    let bodyHtml = '';
    if (q.type === 'mcq' && q.options) {
      bodyHtml = `
        <div class="qz-opts flex flex-col gap-2.5 my-4" id="mcq-opts">
          ${q.options
            .map((opt, idx) => {
              let stateClasses = 'border-brand-line bg-brand-surface2 text-brand-text hover:border-brand-muted/60';
              let letterStateClasses = 'bg-brand-line/60 text-brand-muted';
              let cls = '';
              const isOptionCorrect = checkCorrectness(q, opt);
              if (isChecked) {
                if (isOptionCorrect) {
                  cls = 'correct';
                  stateClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
                  letterStateClasses = 'bg-emerald-500 text-white';
                } else if (opt === saved.value) {
                  cls = 'wrong';
                  stateClasses = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300';
                  letterStateClasses = 'bg-rose-500 text-white';
                }
              } else if (opt === picked) {
                cls = 'sel';
                stateClasses = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200';
                letterStateClasses = 'bg-indigo-600 text-white';
              }
              const letter = 'ABCD'[idx] || `${idx + 1}`;
              return `
                <button type="button" class="qz-opt flex items-center gap-3 text-left border rounded-xl p-3.5 text-sm font-medium w-full transition-all ${stateClasses} ${cls}" data-opt="${escapeHtml(opt)}" ${isChecked ? 'disabled' : ''}>
                  <span class="qz-letter shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${letterStateClasses}">${letter}</span>
                  <span class="flex-1 min-w-0">${escapeHtml(opt)}</span>
                  ${isChecked && isOptionCorrect ? `<span class="ic ml-auto shrink-0 text-emerald-600 dark:text-emerald-400">${icon('check', 15)}</span>` : ''}
                </button>
              `;
            })
            .join('')}
        </div>
      `;
    } else if (q.type === 'tf') {
      bodyHtml = `
        <div class="qz-tf flex gap-3 my-4" id="tf-opts">
          ${['True', 'False']
            .map((val) => {
              let stateClasses = 'border-brand-line bg-brand-surface2 text-brand-text hover:border-brand-muted/60';
              let cls = '';
              const isValCorrect = checkCorrectness(q, val);
              if (isChecked) {
                if (isValCorrect) {
                  cls = 'correct';
                  stateClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300';
                } else if (val.toLowerCase() === saved.value.toLowerCase()) {
                  cls = 'wrong';
                  stateClasses = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300';
                }
              } else if (picked && picked.toLowerCase() === val.toLowerCase()) {
                cls = 'sel';
                stateClasses = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200';
              }
              return `
                <button type="button" class="flex-1 py-3.5 px-4 rounded-xl border font-bold text-sm transition-all ${stateClasses} ${cls}" data-val="${val}" ${isChecked ? 'disabled' : ''}>
                  ${val}
                </button>
              `;
            })
            .join('')}
        </div>
      `;
    } else {
      const val = isChecked ? saved.value : '';
      const cls = isChecked ? (saved.correct ? 'correct' : 'wrong') : '';
      const borderState = isChecked
        ? (saved.correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300')
        : 'border-brand-line bg-brand-surface2 text-brand-text focus:border-indigo-500';
      const inputHtml = `</span><input id="fib-input" class="border border-b-2 border-b-brand-muted rounded-md px-3 py-1 font-mono text-sm min-w-[140px] text-center mx-1.5 outline-none transition-colors ${borderState} ${cls}" type="text" autocomplete="off" ${isChecked ? 'disabled' : ''} value="${escapeHtml(val)}" placeholder="type here"><span>`;
      const promptWithInput = escapeHtml(q.prompt).replace('___', inputHtml);
      bodyHtml = `<div class="qz-fib text-base leading-loose text-brand-text my-4"><span>${promptWithInput}</span></div>`;
    }

    const feedbackHtml = isChecked
      ? `
        <div class="qz-fb mt-4 p-4 rounded-xl text-xs leading-relaxed flex gap-3 items-start border ${saved.correct ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'}">
          <span class="shrink-0 mt-0.5">${icon(saved.correct ? 'check' : 'left', 14)}</span>
          <div>
            <b class="block font-bold mb-0.5">${saved.correct ? 'Correct.' : 'Not quite.'}</b>
            ${escapeHtml(q.explain || q.explanation || '')}
          </div>
        </div>
      `
      : '';

    const dotsHtml = questions
      .map((_, idx) => {
        const isCur = idx === currentIndex;
        const isAnswered = !!localAnswers[idx];
        const dotBg = isCur ? 'bg-brand-text' : isAnswered ? 'bg-emerald-500' : 'bg-brand-line';
        return `<span class="w-2 h-2 rounded-full transition-colors ${dotBg}"></span>`;
      })
      .join('');

    const actionBtnHtml = isChecked
      ? `<button type="button" class="btn dark inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-[#0e1a2c] dark:bg-white text-white dark:text-[#0e1a2c] hover:opacity-90 transition-opacity" id="quiz-next-btn">${currentIndex === total - 1 ? 'Finish' : 'Next'}</button>`
      : `<button type="button" class="btn dark inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-[#0e1a2c] dark:bg-white text-white dark:text-[#0e1a2c] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed" id="quiz-check-btn" ${q.type !== 'fib' && picked === null ? 'disabled' : ''}>Check answer</button>`;

    const contentHtml = `
      <div class="page qz-page p-6 max-w-2xl mx-auto w-full">
        <div class="qz-top flex justify-between items-baseline gap-3 flex-wrap mb-2">
          <h1 class="pg text-2xl font-bold tracking-tight text-brand-text">${escapeHtml(card.title)}</h1>
          <span class="qz-count text-xs font-semibold text-brand-muted">Question ${currentIndex + 1} of ${total}</span>
        </div>
        <div class="bar h-1.5 bg-brand-line rounded-full overflow-hidden my-3">
          <i class="block h-full bg-emerald-500 transition-all duration-300" style="width: ${Math.round((answeredCount / total) * 100)}%;"></i>
        </div>
        <div class="qz-card bg-brand-surface border border-brand-line rounded-xl p-6 sm:p-7 shadow-xs">
          <div class="qz-type text-[10px] font-bold tracking-wider text-brand-muted uppercase mb-2">${typeLabel}</div>
          <div class="qz-q text-lg font-semibold tracking-tight text-brand-text mb-4">${q.type === 'fib' ? '' : escapeHtml(q.prompt)}</div>
          ${bodyHtml}
          ${feedbackHtml}
          <div class="qz-foot flex justify-between items-center mt-6 pt-2">
            <div class="qz-dots flex items-center gap-1.5">${dotsHtml}</div>
            <div class="flex items-center gap-2">
              <button type="button" class="btn inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-brand-surface border border-brand-line text-brand-text hover:bg-brand-surface2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" id="quiz-prev-btn" ${currentIndex === 0 ? 'disabled' : ''}>Previous</button>
              ${actionBtnHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = renderShell('practice', contentHtml, [
      'Practice Library',
      card.topic,
      card.title,
    ]);
    attachShellEvents(container);

    // Event attachments
    if (!isChecked) {
      if (q.type === 'mcq') {
        const optsContainer = container.querySelector('#mcq-opts');
        if (optsContainer) {
          optsContainer.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('.qz-opt') as HTMLButtonElement | null;
            if (!btn) return;
            picked = btn.dataset.opt || null;
            optsContainer.querySelectorAll('.qz-opt').forEach((el) => {
              const isSelected = (el as HTMLButtonElement).dataset.opt === picked;
              el.classList.toggle('sel', isSelected);
              el.classList.toggle('border-indigo-500', isSelected);
              el.classList.toggle('bg-indigo-50', isSelected);
              el.classList.toggle('text-indigo-700', isSelected);
              const letter = el.querySelector('.qz-letter');
              if (letter) {
                letter.classList.toggle('bg-indigo-500', isSelected);
                letter.classList.toggle('text-white', isSelected);
              }
            });
            const checkBtn = container.querySelector('#quiz-check-btn') as HTMLButtonElement | null;
            if (checkBtn) checkBtn.disabled = false;
          });
        }
      } else if (q.type === 'tf') {
        const tfContainer = container.querySelector('#tf-opts');
        if (tfContainer) {
          tfContainer.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
            if (!btn) return;
            picked = btn.dataset.val || null;
            tfContainer.querySelectorAll('button').forEach((el) => {
              const isSelected = el.dataset.val === picked;
              el.classList.toggle('sel', isSelected);
              el.classList.toggle('border-indigo-500', isSelected);
              el.classList.toggle('bg-indigo-50', isSelected);
              el.classList.toggle('text-indigo-700', isSelected);
            });
            const checkBtn = container.querySelector('#quiz-check-btn') as HTMLButtonElement | null;
            if (checkBtn) checkBtn.disabled = false;
          });
        }
      } else {
        const fibInput = container.querySelector('#fib-input') as HTMLInputElement | null;
        if (fibInput) {
          fibInput.focus();
          fibInput.oninput = () => {
            const checkBtn = container.querySelector('#quiz-check-btn') as HTMLButtonElement | null;
            if (checkBtn) checkBtn.disabled = !fibInput.value.trim();
          };
          fibInput.onkeydown = (e) => {
            if (e.key === 'Enter' && fibInput.value.trim()) {
              doCheckAnswer();
            }
          };
        }
      }

      const checkBtn = container.querySelector('#quiz-check-btn') as HTMLButtonElement | null;
      if (checkBtn) {
        checkBtn.onclick = () => {
          doCheckAnswer();
        };
      }
    } else {
      const nextBtn = container.querySelector('#quiz-next-btn') as HTMLButtonElement | null;
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (currentIndex === total - 1) {
            isDone = true;
            renderResult();
          } else {
            currentIndex += 1;
            renderQuestion();
          }
        };
      }
    }

    const prevBtn = container.querySelector('#quiz-prev-btn') as HTMLButtonElement | null;
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderQuestion();
        }
      };
    }

    async function doCheckAnswer(): Promise<void> {
      let userValue = picked || '';
      if (q.type === 'fib') {
        const fibInput = container.querySelector('#fib-input') as HTMLInputElement | null;
        userValue = fibInput ? fibInput.value.trim() : '';
      }

      const isCorrect = checkCorrectness(q, userValue);
      localAnswers[currentIndex] = { value: userValue, correct: isCorrect };

      // Persist progress asynchronously via API
      try {
        await upsertQuizProgress(topicId, {
          questionIndex: currentIndex,
          selectedAnswer: userValue,
          isCorrect,
        });
      } catch {
        // Fallback: local answer recorded
      }

      renderQuestion();
    }
  }

  if (isDone) {
    renderResult();
  } else {
    renderQuestion();
  }
}
