import { test, expect } from '@playwright/test';

test.describe('Coding Workbench Lifecycle & Anomaly Guard', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clear backend submissions so problem starts in clean unsolved state
    try {
      await request.delete('http://127.0.0.1:8000/api/problems/python-basics:two-sum/submissions');
    } catch {
      // ignore
    }
    // Clear localStorage before test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('full user flow: navigation, markdown table rendering, incomplete code rejection, and verified solved state', async ({ page }) => {
    // 1. Navigate from sidebar to Code Library
    await page.goto('/');
    const codeNav = page.locator('aside a[data-nav="code"]');
    await expect(codeNav).toBeVisible();
    await codeNav.click();

    await expect(page).toHaveURL(/#\/code/);
    await expect(page.locator('.topbar')).toContainText('Code Library');

    // 2. Select Python Fundamentals Study Plan
    const pyBasicsCard = page.locator('a.card[href="#/plans/python-basics"]');
    await expect(pyBasicsCard).toBeVisible();
    await pyBasicsCard.click();

    await expect(page).toHaveURL(/#\/plans\/python-basics/);
    await expect(page.locator('h1.pg')).toContainText('Python Fundamentals');

    // 3. Verify Two Sum initially is NOT solved (tick button does not have 'done' class)
    const twoSumItem = page.locator('.row[data-pid="python-basics:two-sum"]');
    await expect(twoSumItem).toBeVisible();
    const twoSumTick = twoSumItem.locator('button[data-tick="python-basics:two-sum"]');
    await expect(twoSumTick).not.toHaveClass(/\bdone\b/);

    // 4. Open Two Sum problem workbench
    await twoSumItem.click();
    await expect(page).toHaveURL(/#\/problem\/python-basics%3Atwo-sum|#\/problem\/python-basics:two-sum/);
    await expect(page.locator('#bento-left')).toContainText('Two Sum');

    // Verify markdown rendering: description should contain formatted headings and monospace blocks
    const descSection = page.locator('#left-card-body');
    await expect(descSection).toBeVisible();
    await expect(descSection.locator('h3').first()).toBeVisible();

    // Verify editor has starter code with pass
    const editor = page.locator('#code-textarea');
    await expect(editor).toBeVisible();
    const starterCode = await editor.inputValue();
    expect(starterCode).toContain('pass');

    // 5. NEGATIVE PATH: Run with incomplete starter code
    const runBtn = page.locator('#run-code-btn');
    await runBtn.click();

    const statusPill = page.locator('#execution-status-pill');
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // Console output should indicate Wrong Answer / incomplete execution
    const consoleOutput = page.locator('#console-output-pre');
    await expect(consoleOutput).toBeVisible();
    const runOutputText = await consoleOutput.innerText();
    expect(runOutputText).toMatch(/Wrong Answer|Error|Failed/i);

    // 6. NEGATIVE PATH: Submit with incomplete starter code
    const submitBtn = page.locator('#submit-code-btn');
    await submitBtn.click();
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // 7. Verify Anomaly Guard: Navigate back to Study Plan and ensure Two Sum is STILL NOT SOLVED
    const backBtn = page.locator('#crumb-back-btn');
    if (await backBtn.isVisible()) {
      await backBtn.click();
    } else {
      await page.goto('/#/plans/python-basics');
    }

    await expect(page).toHaveURL(/#\/plans\/python-basics/);
    await expect(twoSumTick).not.toHaveClass(/\bdone\b/);

    // 8. POSITIVE PATH: Re-open Two Sum and input correct working solution
    await twoSumItem.click();
    await expect(page).toHaveURL(/#\/problem\/python-basics%3Atwo-sum|#\/problem\/python-basics:two-sum/);

    const validSolution = `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in seen:
                return [seen[diff], i]
            seen[num] = i
        return []
`;

    // Fill valid solution into editor
    await editor.fill(validSolution);
    await editor.dispatchEvent('input');

    // Run valid solution and verify all cases pass in console
    await runBtn.click();
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });
    const passedConsole = await consoleOutput.innerText();
    expect(passedConsole).toContain('Passed: All 3 test cases passed.');

    // Submit valid solution
    await submitBtn.click();
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // Verify submission toast
    const toast = page.locator('#toast');
    await expect(toast).toContainText('Accepted');

    // 9. Navigate back to Study Plan and verify Two Sum is NOW MARKED SOLVED
    await page.goto('/#/plans/python-basics');
    await expect(page).toHaveURL(/#\/plans\/python-basics/);
    await expect(twoSumTick).toHaveClass(/\bdone\b/);

    // 10. Verify SQL Markdown Table Rendering
    await page.goto('/#/code');
    const sqlCard = page.locator('a.card[href="#/plans/sql-50"]');
    await expect(sqlCard).toBeVisible();
    await sqlCard.click();

    const sqlProblem = page.locator('.row[data-pid="sql-50:recyclable-and-low-fat-products"]');
    await expect(sqlProblem).toBeVisible();
    await sqlProblem.click();

    // Verify markdown tables rendered inside description
    const renderedTable = page.locator('#left-card-body table');
    await expect(renderedTable.first()).toBeVisible();
    await expect(renderedTable.first()).toContainText('product_id');
  });
});
