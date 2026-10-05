import { test, expect } from '@playwright/test';

/**
 * Study Plan Progress Synchronization E2E Tests
 *
 * Verifies that progress metrics stay in sync across:
 *   1. Plan view tick buttons (toggle solved via backend API)
 *   2. Code catalog summary cards (X/N counter)
 *   3. Workbench "Run Code" accepted state
 *   4. Backend database (user_coding_submissions table)
 */
test.describe('Study Plan Progress Synchronization', () => {
  // Use a problem that is easy to reset and verify
  const planId = 'sql-beginner';
  const probId = 'sql-beginner:subscription-upgrade-candidates';

  test.beforeEach(async ({ page, request }) => {
    // Clear submissions for the target problem so it starts unsolved
    try {
      await request.delete(
        `http://127.0.0.1:8000/api/problems/${probId}/submissions`
      );
    } catch {
      // ignore if no submissions exist
    }
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('manual tick toggle syncs progress between plan view and catalog card', async ({
    page,
  }) => {
    // 1. Navigate to Code Library and read initial solved count from the catalog card
    await page.goto('/#/code');
    const planCard = page.locator(`a.card[href="#/plans/${planId}"]`);
    await expect(planCard).toBeVisible();

    const footerTool = planCard.locator('.tool');
    const initialFooterText = await footerTool.innerText();
    // Parse "SQL . X/5" pattern to extract the solved count
    const initialMatch = initialFooterText.match(/(\d+)\/(\d+)/);
    expect(initialMatch).not.toBeNull();
    const initialSolved = parseInt(initialMatch![1], 10);
    const totalProblems = parseInt(initialMatch![2], 10);

    // 2. Navigate to the plan detail view
    await planCard.click();
    await expect(page).toHaveURL(new RegExp(`#/plans/${planId}`));
    await expect(page.locator('h1.pg')).toContainText('SQL Beginner');

    // 3. Verify the target problem starts unsolved
    const tickBtn = page.locator(`button[data-tick="${probId}"]`);
    await expect(tickBtn).toBeVisible();
    await expect(tickBtn).not.toHaveClass(/\bdone\b/);

    // Read plan view progress label before toggling
    const progLabel = page.locator('#plan-prog-label');
    await expect(progLabel).toContainText(`${initialSolved} of ${totalProblems} solved`);

    // 4. Toggle the problem to SOLVED via tick button
    await tickBtn.click();

    // Wait for re-render: tick should now have 'done' class
    await expect(tickBtn).toHaveClass(/\bdone\b/, { timeout: 5000 });

    // Progress label should increment
    const expectedSolved = initialSolved + 1;
    await expect(progLabel).toContainText(
      `${expectedSolved} of ${totalProblems} solved`
    );

    // Toast should confirm
    const toast = page.locator('#toast');
    await expect(toast).toContainText('Marked as completed');

    // 5. Navigate back to catalog and verify the card counter updated
    await page.goto('/#/code');
    await expect(planCard).toBeVisible();

    // Use auto-retry to handle the background revalidation fetch
    await expect(async () => {
      const updatedText = await footerTool.innerText();
      const updatedMatch = updatedText.match(/(\d+)\/(\d+)/);
      expect(updatedMatch).not.toBeNull();
      expect(parseInt(updatedMatch![1], 10)).toBe(expectedSolved);
    }).toPass({ timeout: 5000 });

    // 6. Toggle the problem back to UNSOLVED
    await planCard.click();
    await expect(page).toHaveURL(new RegExp(`#/plans/${planId}`));

    const tickBtnAgain = page.locator(`button[data-tick="${probId}"]`);
    await expect(tickBtnAgain).toHaveClass(/\bdone\b/);
    await tickBtnAgain.click();

    // Tick should lose 'done' class
    await expect(tickBtnAgain).not.toHaveClass(/\bdone\b/, { timeout: 5000 });
    await expect(progLabel).toContainText(
      `${initialSolved} of ${totalProblems} solved`
    );

    // 7. Navigate to catalog again and verify the counter reverted
    await page.goto('/#/code');
    await expect(planCard).toBeVisible();

    await expect(async () => {
      const revertedText = await footerTool.innerText();
      const revertedMatch = revertedText.match(/(\d+)\/(\d+)/);
      expect(revertedMatch).not.toBeNull();
      expect(parseInt(revertedMatch![1], 10)).toBe(initialSolved);
    }).toPass({ timeout: 5000 });
  });

  test('backend API reflects toggle-solved changes', async ({ request }) => {
    // 1. Toggle problem to solved via API
    const onRes = await request.post(
      `http://127.0.0.1:8000/api/problems/${probId}/toggle-solved`
    );
    expect(onRes.ok()).toBe(true);
    const onBody = await onRes.json();
    expect(onBody.solved).toBe(true);

    // 2. Verify plan summary reflects the change
    const planRes = await request.get(
      `http://127.0.0.1:8000/api/plans/${planId}`
    );
    expect(planRes.ok()).toBe(true);
    const planData = await planRes.json();
    const prob = planData.problems.find(
      (p: { id: string }) => p.id === probId
    );
    expect(prob).toBeDefined();
    expect(prob.solved).toBe(true);

    // 3. Toggle back to unsolved
    const offRes = await request.post(
      `http://127.0.0.1:8000/api/problems/${probId}/toggle-solved`
    );
    expect(offRes.ok()).toBe(true);
    const offBody = await offRes.json();
    expect(offBody.solved).toBe(false);

    // 4. Verify plan summary reverted
    const planRes2 = await request.get(
      `http://127.0.0.1:8000/api/plans/${planId}`
    );
    const planData2 = await planRes2.json();
    const prob2 = planData2.problems.find(
      (p: { id: string }) => p.id === probId
    );
    expect(prob2.solved).toBe(false);
  });

  test('accepted workbench run syncs solved state to plan view', async ({
    page,
  }) => {
    const workbenchProbId = 'sql-beginner:high-value-settled-transactions';

    // Clean submissions for the workbench target problem
    await page.request.delete(
      `http://127.0.0.1:8000/api/problems/${workbenchProbId}/submissions`
    );

    // 1. Navigate to the problem workbench
    await page.goto(
      `/#/problem/${encodeURIComponent(workbenchProbId)}`
    );
    await expect(page.locator('#bento-workspace')).toBeVisible();

    // Verify problem title is visible
    await expect(page.locator('#bento-left')).toContainText(
      'High-Value Settled Transactions'
    );

    // 2. Enter a valid solution
    const editor = page.locator('#code-textarea');
    await expect(editor).toBeVisible();

    const validSolution = `SELECT
    tx_id,
    sender_id,
    receiver_id,
    amount,
    currency
FROM
    Transactions
WHERE
    status = 'Settled'
    AND sender_id != receiver_id
    AND (
        (currency = 'USD' AND amount > 500.00)
        OR (currency = 'EUR' AND amount > 450.00)
    )
ORDER BY
    amount DESC,
    tx_id ASC;`;

    await editor.fill(validSolution);
    await editor.dispatchEvent('input');

    // 3. Run the solution
    const runBtn = page.locator('#run-code-btn');
    await runBtn.click();

    const statusPill = page.locator('#execution-status-pill');
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // Verify Accepted result
    const consoleOutput = page.locator('#console-output-pre');
    await expect(consoleOutput).toContainText('Accepted', { timeout: 10000 });

    // 4. Navigate to the study plan and verify problem is solved
    await page.goto(`/#/plans/${planId}`);
    await expect(page).toHaveURL(new RegExp(`#/plans/${planId}`));

    const tick = page.locator(
      `button[data-tick="${workbenchProbId}"]`
    );
    await expect(tick).toHaveClass(/\bdone\b/, { timeout: 5000 });

    // 5. Verify catalog card counter includes this solved problem
    await page.goto('/#/code');
    const planCard = page.locator(`a.card[href="#/plans/${planId}"]`);
    await expect(planCard).toBeVisible();

    const footerTool = planCard.locator('.tool');
    await expect(async () => {
      const text = await footerTool.innerText();
      const match = text.match(/(\d+)\/(\d+)/);
      expect(match).not.toBeNull();
      // The solved count should include this problem
      expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 5000 });

    // 6. Cleanup: un-solve the workbench problem
    await page.request.post(
      `http://127.0.0.1:8000/api/problems/${workbenchProbId}/toggle-solved`
    );
  });
});
