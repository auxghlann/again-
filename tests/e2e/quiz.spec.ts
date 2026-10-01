import { test, expect } from '@playwright/test';

test.describe('Practice Quiz Journey', () => {
  test('navigates to catalog, starts quiz, answers questions, and views completion summary', async ({ page }) => {
    // 1. Visit root home (Practice Catalog)
    await page.goto('/');

    // Verify brand in sidebar
    await expect(page.locator('.brand')).toContainText('again!');

    // Verify practice library cards are rendered
    const cards = page.locator('a.card');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // 2. Select Python Dictionary Comprehension card
    const pyCard = page.locator('a.card[href="#/quiz/python-dictionary-comprehension"]');
    await expect(pyCard).toBeVisible();
    await pyCard.click();

    // Verify hash route changed to quiz
    await expect(page).toHaveURL(/#\/quiz\/python-dictionary-comprehension/);

    // 3. Auto-wait for quiz card and question dots to render
    await expect(page.locator('.qz-card')).toBeVisible();
    const dots = page.locator('.qz-dots span');
    await expect(dots.first()).toBeVisible();
    const totalQuestions = await dots.count();
    expect(totalQuestions).toBeGreaterThan(0);

    // 4. Answer questions iteratively
    for (let i = 0; i < totalQuestions; i++) {
      await expect(page.locator('.qz-card')).toBeVisible();

      const mcqOptions = page.locator('.qz-opt');
      const tfOptions = page.locator('.qz-tf button');

      if ((await mcqOptions.count()) > 0) {
        await mcqOptions.first().click();
      } else if ((await tfOptions.count()) > 0) {
        await tfOptions.first().click();
      } else {
        const textInput = page.locator('#fib-input');
        if (await textInput.isVisible()) {
          await textInput.fill('test');
        }
      }

      // Click "Check answer"
      const checkBtn = page.locator('#quiz-check-btn');
      await expect(checkBtn).toBeEnabled();
      await checkBtn.click();

      // Verify feedback banner and explanation are displayed
      await expect(page.locator('.qz-fb')).toBeVisible();

      // Click "Next" or "Finish"
      const nextBtn = page.locator('#quiz-next-btn');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
    }

    // 5. Verify completion summary card
    await expect(page.locator('.qz-result')).toBeVisible();
    await expect(page.locator('.qz-score')).toBeVisible();
    await expect(page.locator('#quiz-retry-btn')).toBeVisible();
    await expect(page.locator('#quiz-back-btn')).toBeVisible();

    // Return to practice library
    await page.locator('#quiz-back-btn').click();
    await expect(page).toHaveURL(/#\/(?:practice)?$/);
    await expect(page.locator('.brand')).toContainText('again!');
  });
});
