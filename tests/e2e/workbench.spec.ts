import { test, expect } from '@playwright/test';

test.describe('Coding Workbench Journey', () => {
  test('navigates to code plans, opens problem, runs code, and toggles theme', async ({ page }) => {
    // 1. Visit Code Library
    await page.goto('/#/code');

    // Verify topbar breadcrumb contains Code Library
    await expect(page.locator('.topbar')).toContainText('Code Library');

    // Verify study plan cards exist
    const planCards = page.locator('a.card');
    await expect(planCards.first()).toBeVisible();

    // 2. Open Python Basics study plan
    const pyBasicsCard = page.locator('a.card[href="#/plans/python-basics"]');
    await expect(pyBasicsCard).toBeVisible();
    await pyBasicsCard.click();

    // Verify Study Plan checklist view
    await expect(page).toHaveURL(/#\/plans\/python-basics/);
    await expect(page.locator('h1.pg')).toContainText('Python Fundamentals');

    // 3. Open Two Sum problem
    const twoSumItem = page.locator('.row[data-pid="python-basics:two-sum"]');
    await expect(twoSumItem).toBeVisible();
    await twoSumItem.click();

    // Verify Dual-Pane Problem Workbench
    await expect(page).toHaveURL(/#\/problem\/python-basics%3Atwo-sum|#\/problem\/python-basics:two-sum/);
    await expect(page.locator('.prob-top')).toContainText('Two Sum');

    // Verify editor in right pane
    const editor = page.locator('#code-textarea');
    await expect(editor).toBeVisible();
    const starterCode = await editor.inputValue();
    expect(starterCode.length).toBeGreaterThan(0);

    // 4. Execute Code
    const runBtn = page.locator('#run-code-btn');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait for console status label or execution pill to update from running
    const statusPill = page.locator('#execution-status-pill');
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // Verify console output is populated
    const consoleOutput = page.locator('#console-output-pre');
    await expect(consoleOutput).toBeVisible();
    const outputText = await consoleOutput.innerText();
    expect(outputText).not.toContain('Run your code to see output here.');

    // 5. Test Theme Toggling
    const themeBtn = page.locator('#theme-toggle-btn');
    await expect(themeBtn).toBeVisible();

    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await themeBtn.click();
    const toggledTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(toggledTheme).not.toEqual(initialTheme);
  });
});
