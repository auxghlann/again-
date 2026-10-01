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
      <div class="page qz-page">
        <div class="qz-card qz-result">
          <div class="c-label g">COMPLETED</div>
          <div class="qz-score">${score}/${total}</div>
          <p class="sub">You got ${score} out of ${total} questions right on "${escapeHtml(card.title)}".</p>
          <div class="btnrow">
            <button type="button" class="btn lg" id="quiz-retry-btn">Retry</button>
            <a class="btn dark lg" href="#/practice" id="quiz-back-btn">Back to Practice</a>
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
        <div class="qz-opts" id="mcq-opts">
          ${q.options
            .map((opt, idx) => {
              let cls = '';
              const isOptionCorrect = checkCorrectness(q, opt);
              if (isChecked) {
                if (isOptionCorrect) cls = 'correct';
                else if (opt === saved.value) cls = 'wrong';
              } else if (opt === picked) {
                cls = 'sel';
              }
              const letter = 'ABCD'[idx] || `${idx + 1}`;
              return `
                <button type="button" class="qz-opt ${cls}" data-opt="${escapeHtml(opt)}" ${isChecked ? 'disabled' : ''}>
                  <span class="qz-letter">${letter}</span>
                  <span>${escapeHtml(opt)}</span>
                  ${isChecked && isOptionCorrect ? `<span class="ic">${icon('check', 15)}</span>` : ''}
                </button>
              `;
            })
            .join('')}
        </div>
      `;
    } else if (q.type === 'tf') {
      bodyHtml = `
        <div class="qz-tf" id="tf-opts">
          ${['True', 'False']
            .map((val) => {
              let cls = '';
              const isValCorrect = checkCorrectness(q, val);
              if (isChecked) {
                if (isValCorrect) cls = 'correct';
                else if (val.toLowerCase() === saved.value.toLowerCase()) cls = 'wrong';
              } else if (picked && picked.toLowerCase() === val.toLowerCase()) {
                cls = 'sel';
              }
              return `
                <button type="button" class="${cls}" data-val="${val}" ${isChecked ? 'disabled' : ''}>
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
      const inputHtml = `</span><input id="fib-input" class="${cls}" type="text" autocomplete="off" ${isChecked ? 'disabled' : ''} value="${escapeHtml(val)}" placeholder="type here"><span>`;
      const promptWithInput = escapeHtml(q.prompt).replace('___', inputHtml);
      bodyHtml = `<div class="qz-fib"><span>${promptWithInput}</span></div>`;
    }

    const feedbackHtml = isChecked
      ? `
        <div class="qz-fb ${saved.correct ? 'ok' : 'bad'}">
          ${icon(saved.correct ? 'check' : 'left', 14)}
          <div>
            <b>${saved.correct ? 'Correct.' : 'Not quite.'}</b>
            ${escapeHtml(q.explain || q.explanation || '')}
          </div>
        </div>
      `
      : '';

    const dotsHtml = questions
      .map((_, idx) => {
        const isCur = idx === currentIndex;
        const isAnswered = !!localAnswers[idx];
        return `<span class="${isCur ? 'cur' : isAnswered ? 'done' : ''}"></span>`;
      })
      .join('');

    const actionBtnHtml = isChecked
      ? `<button type="button" class="btn dark" id="quiz-next-btn">${currentIndex === total - 1 ? 'Finish' : 'Next'}</button>`
      : `<button type="button" class="btn dark" id="quiz-check-btn" ${q.type !== 'fib' && picked === null ? 'disabled' : ''}>Check answer</button>`;

    const contentHtml = `
      <div class="page qz-page">
        <div class="qz-top">
          <h1 class="pg">${escapeHtml(card.title)}</h1>
          <span class="qz-count">Question ${currentIndex + 1} of ${total}</span>
        </div>
        <div class="bar">
          <i style="width: ${Math.round((answeredCount / total) * 100)}%;"></i>
        </div>
        <div class="qz-card">
          <div class="qz-type">${typeLabel}</div>
          <div class="qz-q">${q.type === 'fib' ? '' : escapeHtml(q.prompt)}</div>
          ${bodyHtml}
          ${feedbackHtml}
          <div class="qz-foot">
            <div class="qz-dots">${dotsHtml}</div>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn" id="quiz-prev-btn" ${currentIndex === 0 ? 'disabled' : ''}>Previous</button>
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
              el.classList.toggle('sel', (el as HTMLButtonElement).dataset.opt === picked);
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
              el.classList.toggle('sel', el.dataset.val === picked);
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
