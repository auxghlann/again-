import { test, expect } from '@playwright/test';

test.describe('Coding Workbench Lifecycle & Anomaly Guard', () => {
  const probId = 'sql-beginner:low-stock-inventory-alert';

  let initialSubIds = new Set<string>();

  test.beforeEach(async ({ page, request }) => {
    // Record existing submission IDs so pre-existing user data is never deleted
    try {
      const res = await request.get(`http://127.0.0.1:8000/api/problems/${probId}/submissions`);
      if (res.ok()) {
        const data = await res.json();
        initialSubIds = new Set(data.map((s: { id: string }) => s.id));
      }
    } catch { }

    // Clear localStorage before test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.afterEach(async ({ request }) => {
    // Clean up ONLY newly added submissions created during this test run
    try {
      const res = await request.get(`http://127.0.0.1:8000/api/problems/${probId}/submissions`);
      if (res.ok()) {
        const data = await res.json();
        for (const s of data) {
          if (!initialSubIds.has(s.id)) {
            await request.delete(`http://127.0.0.1:8000/api/submissions/${s.id}`);
          }
        }
      }
    } catch { }
  });

  test('full user flow: navigation, markdown table rendering, incomplete code rejection, and verified solved state', async ({ page }) => {
    // 1. Navigate from sidebar to Code Library
    await page.goto('/');
    const codeNav = page.locator('aside a[data-nav="code"]');
    await expect(codeNav).toBeVisible();
    await codeNav.click();

    await expect(page).toHaveURL(/#\/code/);
    await expect(page.locator('.topbar')).toContainText('Code Library');

    // 2. Select SQL Beginner Study Plan
    const sqlBeginnerCard = page.locator('a.card[href="#/plans/sql-beginner"]');
    await expect(sqlBeginnerCard).toBeVisible();
    await sqlBeginnerCard.click();

    await expect(page).toHaveURL(/#\/plans\/sql-beginner/);
    await expect(page.locator('h1.pg')).toContainText('SQL Beginner');

    // 3. Verify problem item is visible
    const probItem = page.locator(`.row[data-pid="${probId}"]`);
    await expect(probItem).toBeVisible();
    const probTick = probItem.locator(`button[data-tick="${probId}"]`);
    const isInitiallyDone = await probTick.evaluate((el) => el.classList.contains('done'));
    if (!isInitiallyDone) {
      await expect(probTick).not.toHaveClass(/\bdone\b/);
    }

    // 4. Open Low Stock Inventory Alert problem workbench
    await probItem.click();
    await expect(page).toHaveURL(new RegExp(`#/problem/sql-beginner%3Alow-stock-inventory-alert|#/problem/${probId}`));
    await expect(page.locator('#bento-left')).toContainText('Low Stock Inventory Alert');

    // Verify markdown rendering: description should contain formatted headings and tables
    const descSection = page.locator('#left-card-body');
    await expect(descSection).toBeVisible();
    await expect(descSection.locator('h3').first()).toBeVisible();
    const descTable = descSection.locator('table').first();
    await expect(descTable).toBeVisible();
    await expect(descTable).toContainText('item_id');

    // Verify editor has comment-only starter code without SQL query statement
    const editor = page.locator('#code-textarea');
    await expect(editor).toBeVisible();
    const starterCode = await editor.inputValue();
    expect(starterCode).toContain('-- Write your PostgreSQL query statement below');
    expect(starterCode).not.toContain('SELECT');

    // Verify Testcase tab displays populated Input and Expected Output tables on load
    const tcBox = page.locator('.tc-box');
    await expect(tcBox).toBeVisible();
    await expect(tcBox).toContainText('INPUT');
    await expect(tcBox).toContainText('EXPECTED OUTPUT');
    await expect(tcBox).toContainText('item_id');

    // 5. NEGATIVE PATH: Run with incomplete starter code (which omits WHERE filter)
    const runBtn = page.locator('#run-code-btn');
    await runBtn.click();

    const statusPill = page.locator('#execution-status-pill');
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // Console output should indicate Wrong Answer due to row count mismatch
    const consoleOutput = page.locator('#console-output-pre');
    await expect(consoleOutput).toBeVisible();
    const runOutputText = await consoleOutput.innerText();
    expect(runOutputText).toMatch(/Wrong Answer|Error|mismatch/i);

    // 6. NEGATIVE PATH: Submit with incomplete starter code
    const submitBtn = page.locator('#submit-code-btn');
    await submitBtn.click();
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // 7. Verify Anomaly Guard: Navigate back to Study Plan and ensure problem is STILL NOT SOLVED
    const backBtn = page.locator('#crumb-back-btn');
    if (await backBtn.isVisible()) {
      await backBtn.click();
    } else {
      await page.goto('/#/plans/sql-beginner');
    }

    await expect(page).toHaveURL(/#\/plans\/sql-beginner/);
    if (!isInitiallyDone) {
      await expect(probTick).not.toHaveClass(/\bdone\b/);
    }

    // 8. POSITIVE PATH: Re-open problem and input correct working solution
    await probItem.click();
    await expect(page).toHaveURL(new RegExp(`#/problem/sql-beginner%3Alow-stock-inventory-alert|#/problem/${probId}`));

    const validSolution = `SELECT
    item_id,
    item_name,
    category,
    quantity_in_stock
FROM
    Inventory
WHERE
    is_discontinued = false
    AND quantity_in_stock <= reorder_threshold
ORDER BY
    quantity_in_stock ASC,
    item_id ASC;`;

    // Fill valid solution into editor
    await editor.fill(validSolution);
    await editor.dispatchEvent('input');

    // Run valid solution and verify Accepted in console
    await runBtn.click();
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });
    const passedConsole = await consoleOutput.innerText();
    expect(passedConsole).toMatch(/Accepted|3 rows/i);

    // Submit valid solution
    await submitBtn.click();
    await expect(statusPill).not.toHaveText('RUNNING', { timeout: 15000 });

    // Verify submission toast
    const toast = page.locator('#toast');
    await expect(toast).toContainText('Accepted');

    // 9. Navigate back to Study Plan and verify problem is NOW MARKED SOLVED
    await page.goto('/#/plans/sql-beginner');
    await expect(page).toHaveURL(/#\/plans\/sql-beginner/);
    await expect(probTick).toHaveClass(/\bdone\b/);

    // Clean up only the specific test submission created by this test run
    const subsRes = await page.request.get(`http://127.0.0.1:8000/api/problems/${probId}/submissions`);
    const subs = await subsRes.json();
    if (subs.length > 0) {
      await page.request.delete(`http://127.0.0.1:8000/api/submissions/${subs[0].id}`);
    }

    // 10. Verify SQL Advance track and Markdown table rendering
    await page.goto('/#/code');
    const sqlAdvCard = page.locator('a.card[href="#/plans/sql-advance"]');
    await expect(sqlAdvCard).toBeVisible();
    await sqlAdvCard.click();

    const advProblem = page.locator('.row[data-pid="sql-advance:department-top-three-salaries"]');
    await expect(advProblem).toBeVisible();
    await advProblem.click();

    // Verify markdown tables rendered inside description
    const renderedTable = page.locator('#left-card-body table');
    await expect(renderedTable.first()).toBeVisible();
    await expect(renderedTable.first()).toContainText('salary');
  });

  test('retractable sidebar: collapses to rail mode, expands to full width, and persists in localStorage', async ({ page }) => {
    await page.goto('/');

    const appContainer = page.locator('.app');
    const collapseBtn = page.locator('#sidebar-collapse-btn');
    const brandName = page.locator('.brand span');

    await expect(collapseBtn).toBeVisible();
    await expect(brandName).toBeVisible();
    await expect(appContainer).toHaveClass(/grid-cols-\[224px/);

    // 1. Collapse sidebar to rail mode
    await collapseBtn.click();

    await expect(appContainer).toHaveClass(/grid-cols-\[64px/);
    await expect(brandName).toBeHidden();

    // Verify localStorage persistence
    const isCollapsedStored = await page.evaluate(() => localStorage.getItem('again_sidebar_collapsed'));
    expect(isCollapsedStored).toBe('true');

    // Navigation links in rail mode remain functional
    const codeNav = page.locator('aside a[data-nav="code"]');
    await expect(codeNav).toBeVisible();
    await codeNav.click();
    await expect(page).toHaveURL(/#\/code/);

    // 2. Expand sidebar back to full width
    const expandBtn = page.locator('#sidebar-collapse-btn');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    await expect(appContainer).toHaveClass(/grid-cols-\[224px/);
    await expect(page.locator('.brand span')).toBeVisible();

    const isExpandedStored = await page.evaluate(() => localStorage.getItem('again_sidebar_collapsed'));
    expect(isExpandedStored).toBe('false');
  });

  test('fixed bento card viewports: zero outer page scroll, internal scrolling inside cards, and resizer persistence', async ({ page }) => {
    await page.goto(`/#/problem/${probId}`);
    await expect(page.locator('#bento-workspace')).toBeVisible();

    // 1. Verify zero outer page scrolling (main and window fit viewport)
    const pageMetrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const app = document.querySelector('.app');
      return {
        windowScrollY: window.scrollY,
        mainScrollHeight: main ? main.scrollHeight : 0,
        mainClientHeight: main ? main.clientHeight : 0,
        appClientHeight: app ? app.clientHeight : 0,
        windowInnerHeight: window.innerHeight,
      };
    });

    expect(pageMetrics.windowScrollY).toBe(0);
    // main height should match client height without page-level vertical overflow
    expect(pageMetrics.mainScrollHeight).toBeLessThanOrEqual(pageMetrics.mainClientHeight + 2);

    // 2. Verify problem card (description) scrolls internally
    const descCard = page.locator('#left-card-body');
    await expect(descCard).toBeVisible();

    const descScrollInfo = await page.evaluate(() => {
      const el = document.querySelector('#left-card-body');
      if (!el) return { scrollHeight: 0, clientHeight: 0, scrollTop: 0, windowScrollY: 0 };
      el.scrollTop = 50;
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollTop: el.scrollTop,
        windowScrollY: window.scrollY,
      };
    });

    expect(descScrollInfo.scrollHeight).toBeGreaterThan(descScrollInfo.clientHeight);
    expect(descScrollInfo.scrollTop).toBeGreaterThan(0);
    expect(descScrollInfo.windowScrollY).toBe(0);

    // 3. Verify editor and console split cards remain bounded inside right column
    const rightColMetrics = await page.evaluate(() => {
      const right = document.querySelector('#bento-right');
      const editor = document.querySelector('#bento-editor-card');
      const consoleCard = document.querySelector('#bento-console-card');
      const resizer = document.querySelector('#bento-row-resizer');
      return {
        rightHeight: right ? right.clientHeight : 0,
        editorHeight: editor ? editor.clientHeight : 0,
        consoleHeight: consoleCard ? consoleCard.clientHeight : 0,
        resizerHeight: resizer ? resizer.clientHeight : 0,
      };
    });

    // Sum of editor + console + resizer + gap should not exceed right container
    expect(rightColMetrics.editorHeight).toBeGreaterThan(100);
    expect(rightColMetrics.consoleHeight).toBeGreaterThan(100);
    expect(rightColMetrics.editorHeight + rightColMetrics.consoleHeight).toBeLessThanOrEqual(rightColMetrics.rightHeight);

    // 4. Verify horizontal column resizer updates width and persists
    const colResizer = page.locator('#bento-col-resizer');
    const resizerBox = await colResizer.boundingBox();
    expect(resizerBox).not.toBeNull();
    if (resizerBox) {
      await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(resizerBox.x + 60, resizerBox.y + resizerBox.height / 2, { steps: 5 });
      await page.mouse.up();
    }

    const savedSplitX = await page.evaluate(() => localStorage.getItem('again_bento_split_x'));
    expect(savedSplitX).not.toBeNull();
  });

  test('plan 022: console ascii tables, submission detail view, history inspection, and editor ergonomics', async ({ page }) => {
    await page.goto(`/#/problem/${probId}`);
    await expect(page.locator('#bento-workspace')).toBeVisible();

    const editor = page.locator('#code-textarea');
    const runBtn = page.locator('#run-code-btn');
    const submitBtn = page.locator('#submit-code-btn');
    const consoleOutput = page.locator('#console-output-pre');

    // 1. Editor Ergonomics: Auto-closing pairs & auto-indent
    await editor.focus();
    await editor.fill('');
    await page.keyboard.type('SELECT (');
    expect(await editor.inputValue()).toBe('SELECT ()');

    // Test smart quote pairs
    await editor.fill('');
    await page.keyboard.type('SELECT "item');
    expect(await editor.inputValue()).toBe('SELECT "item"');

    // 2. Console Structured Output: Run query with wrong filter to verify ASCII table output on error
    const partialQuery = `SELECT item_id, item_name, category, quantity_in_stock FROM Inventory WHERE quantity_in_stock = 999;`;
    await editor.fill(partialQuery);
    await editor.dispatchEvent('input');
    await runBtn.click();

    // Verify console contains structured Markdown/ASCII tables (Input, Output, Expected)
    await expect(consoleOutput).toContainText('Input');
    await expect(consoleOutput).toContainText('Output');
    await expect(consoleOutput).toContainText('Expected');
    await expect(consoleOutput).toContainText('| ------- |');
    await expect(consoleOutput).toContainText('item_id');

    // 3. Submission lifecycle: Submit query and verify left panel transitions to detail view
    const validSolution = `SELECT
    item_id,
    item_name,
    category,
    quantity_in_stock
FROM
    Inventory
WHERE
    is_discontinued = false
    AND quantity_in_stock <= reorder_threshold
ORDER BY
    quantity_in_stock ASC,
    item_id ASC;`;

    await editor.fill(validSolution);
    await editor.dispatchEvent('input');
    await submitBtn.click();

    // Verify detail tab appears in left panel
    const detailTab = page.locator('#tab-btn-detail');
    await expect(detailTab).toBeVisible({ timeout: 15000 });
    await expect(detailTab).toContainText('Accepted');

    // Verify detail view content
    const detailTitle = page.locator('#submission-detail-title');
    await expect(detailTitle).toBeVisible();
    await expect(detailTitle).toContainText('Accepted');

    const detailRuntime = page.locator('#submission-detail-runtime');
    await expect(detailRuntime).toBeVisible();
    await expect(detailRuntime).toContainText(/ms/i);
    await expect(detailRuntime).not.toContainText('undefined');

    const detailCases = page.locator('#submission-detail-cases');
    await expect(detailCases).toContainText(/testcases passed/i);

    const detailCode = page.locator('#submission-detail-code');
    await expect(detailCode).toBeVisible();
    await expect(detailCode).toContainText('Inventory');

    // 4. Submissions History: Inspect list and click historical row to reopen details
    const subsTab = page.locator('#tab-btn-subs');
    await expect(subsTab).toBeVisible();
    await subsTab.click();

    const subsBody = page.locator('#left-card-body');
    await expect(subsBody.locator('.sub-row').first()).toBeVisible();

    // Verify history row does not contain 'undefined'
    const firstRow = subsBody.locator('.sub-row').first();
    const firstRowText = await firstRow.innerText();
    expect(firstRowText).not.toContain('undefined ms');
    expect(firstRowText).not.toContain('undefined');
    expect(firstRowText).toMatch(/Accepted/i);
    expect(firstRowText).toMatch(/ms/i);

    // Clicking historical row switches to detail view
    await firstRow.click();
    await expect(page.locator('#submission-detail-title')).toBeVisible();
    await expect(page.locator('#submission-detail-title')).toContainText('Accepted');

    // 5. Switch back to description tab and verify description renders
    await page.locator('#tab-btn-desc').click();
    await expect(page.locator('#tab-btn-desc')).toHaveClass(/active/);
    await expect(page.locator('#left-card-body h3').first()).toBeVisible();

    // 6. Verify returning to submissions table via All Submissions button
    await page.locator('#tab-btn-subs').click();
    await firstRow.click();
    await expect(page.locator('#submission-detail-title')).toBeVisible();
    await page.locator('#back-to-subs-btn').click();
    await expect(subsBody.locator('.sub-row').first()).toBeVisible();
  });
});

