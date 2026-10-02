import { test, expect } from '@playwright/test';

test.describe('Practice Quiz Lifecycle & Feedback Flow', () => {
  test('full user flow: sidebar navigation, topic filtering, answering questions, feedback reveal, and results summary', async ({ page }) => {
    // 1. Visit root home and navigate via sidebar
    await page.goto('/');
    const practiceNav = page.locator('aside a[data-nav="practice"]');
    await expect(practiceNav).toBeVisible();
    await practiceNav.click();

    // Verify URL and practice catalog
    await expect(page).toHaveURL(/#\/practice/);
    await expect(page.locator('.topbar')).toContainText('Practice');

    // 2. Test domain filter chip interaction
    const pythonChip = page.locator('.f-chips button', { hasText: 'Python' });
    if (await pythonChip.isVisible()) {
      await pythonChip.click();
      await expect(pythonChip).toHaveClass(/\bon\b/);
    }

    // 3. Select a Practice topic card
    const targetCard = page.locator('a.card[href="#/quiz/python-dictionary-comprehension"]');
    await expect(targetCard).toBeVisible();
    await targetCard.click();

    // Verify hash route changed to quiz
    await expect(page).toHaveURL(/#\/quiz\/python-dictionary-comprehension/);

    // 4. Auto-wait for quiz question container and question dots
    const dots = page.locator('.qz-dots span');
    await expect(dots.first()).toBeVisible();
    const totalQuestions = await dots.count();
    expect(totalQuestions).toBeGreaterThan(0);

    // 5. Answer each question through the lifecycle
    for (let i = 0; i < totalQuestions; i++) {
      // Find available options: Multiple Choice, True/False, or Fill-in-the-Blank
      const mcqOptions = page.locator('.qz-opt');
      const tfOptions = page.locator('.qz-tf button');
      const fibInput = page.locator('#fib-input');

      if ((await mcqOptions.count()) > 0) {
        await mcqOptions.first().click();
      } else if ((await tfOptions.count()) > 0) {
        await tfOptions.first().click();
      } else if (await fibInput.isVisible()) {
        await fibInput.fill('comprehension');
      }

      // Click "Check answer"
      const checkBtn = page.locator('#quiz-check-btn');
      await expect(checkBtn).toBeEnabled();
      await checkBtn.click();

      // Verify feedback banner (.qz-fb) reveals authoritative technical explanation
      const feedbackBanner = page.locator('.qz-fb');
      await expect(feedbackBanner).toBeVisible();
      const feedbackText = await feedbackBanner.innerText();
      expect(feedbackText.length).toBeGreaterThan(5);

      // Advance to next question or finish
      const nextBtn = page.locator('#quiz-next-btn');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
    }

    // 6. Verify Quiz Completion Summary Card
    const resultCard = page.locator('.qz-result');
    await expect(resultCard).toBeVisible();
    await expect(resultCard.locator('.qz-score')).toBeVisible();

    // 7. Verify "Back to Practice" navigation
    const backToPracticeBtn = page.locator('#quiz-back-btn');
    await expect(backToPracticeBtn).toBeVisible();
    await backToPracticeBtn.click();

    await expect(page).toHaveURL(/#\/practice/);
    await expect(page.locator('.topbar')).toContainText('Practice');
  });
});
