import { test, expect } from '@playwright/test';

test.describe('Study Plan Problem Navigation & Controls', () => {
  const planId = 'sql-beginner';

  test('filtering and sorting controls update visible problems and counter', async ({ page }) => {
    await page.goto(`/#/plans/${planId}`);
    await expect(page.locator('#problem-list-container')).toBeVisible();

    const filterSel = page.locator('#plan-filter-sel');
    const sortSel = page.locator('#plan-sort-sel');
    const planCount = page.locator('#plan-count');

    await expect(filterSel).toBeVisible();
    await expect(sortSel).toBeVisible();

    const initialRows = page.locator('.row');
    const totalCount = await initialRows.count();
    expect(totalCount).toBeGreaterThan(0);
    await expect(planCount).toContainText(`${totalCount} Problems`);

    // 1. Filter by Easy difficulty
    await filterSel.selectOption('easy');
    const easyRows = page.locator('.row');
    const easyCount = await easyRows.count();
    expect(easyCount).toBeGreaterThan(0);
    expect(easyCount).toBeLessThanOrEqual(totalCount);
    await expect(planCount).toContainText(`${easyCount} of ${totalCount} Problems`);

    for (let i = 0; i < easyCount; i++) {
      await expect(easyRows.nth(i).locator('.df')).toContainText('Easy');
    }

    // 2. Sort by Title ascending
    await sortSel.selectOption('title-asc');
    const firstAscTitle = (await page.locator('.row .t').first().innerText()).trim();
    const lastAscTitle = (await page.locator('.row .t').last().innerText()).trim();
    expect(firstAscTitle.localeCompare(lastAscTitle)).toBeLessThanOrEqual(0);

    // 3. Sort by Title descending
    await sortSel.selectOption('title-desc');
    const firstDescTitle = (await page.locator('.row .t').first().innerText()).trim();
    const lastDescTitle = (await page.locator('.row .t').last().innerText()).trim();
    expect(firstDescTitle.localeCompare(lastDescTitle)).toBeGreaterThanOrEqual(0);

    // 4. Reset filter to All
    await filterSel.selectOption('all');
    await expect(page.locator('.row')).toHaveCount(totalCount);
    await expect(planCount).toContainText(`${totalCount} Problems`);
  });

  test('clicking a problem row opens the problem workbench', async ({ page }) => {
    await page.goto(`/#/plans/${planId}`);
    await expect(page.locator('#problem-list-container')).toBeVisible();

    const firstRow = page.locator('.row').first();
    await expect(firstRow).toBeVisible();
    const targetTitle = (await firstRow.locator('.t').innerText()).trim();
    const targetPid = await firstRow.getAttribute('data-pid');
    expect(targetPid).not.toBeNull();

    // Click problem row to open workbench
    await firstRow.click();

    // Verify navigation and bento layout
    await expect(page).toHaveURL(new RegExp(`#/problem/`));
    await expect(page.locator('#bento-workspace')).toBeVisible();
    await expect(page.locator('#bento-left')).toContainText(targetTitle);
    await expect(page.locator('#code-textarea')).toBeVisible();
  });

  test('filter state persists when navigating to problem workbench and returning', async ({ page }) => {
    await page.goto(`/#/plans/${planId}`);
    await expect(page.locator('#problem-list-container')).toBeVisible();

    const filterSel = page.locator('#plan-filter-sel');
    await expect(filterSel).toBeVisible();

    const initialTotal = await page.locator('.row').count();
    expect(initialTotal).toBeGreaterThan(0);

    // 1. Filter by Easy
    await filterSel.selectOption('easy');
    const easyCount = await page.locator('.row').count();
    expect(easyCount).toBeGreaterThan(0);
    expect(easyCount).toBeLessThanOrEqual(initialTotal);

    // 2. Click first problem to navigate into workbench
    const firstRow = page.locator('.row').first();
    await firstRow.click();
    await expect(page.locator('#bento-workspace')).toBeVisible();

    // 3. Click breadcrumb back button to return to study plan
    const backBtn = page.locator('#crumb-back-btn');
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    // 4. Verify returning to plan view retains 'easy' filter
    await expect(page).toHaveURL(new RegExp(`#/plans/${planId}`));
    await expect(page.locator('#problem-list-container')).toBeVisible();

    const restoredFilterSel = page.locator('#plan-filter-sel');
    await expect(restoredFilterSel).toHaveValue('easy');

    // Rows and count should still reflect 'easy' filter
    const restoredRows = page.locator('.row');
    await expect(restoredRows).toHaveCount(easyCount);
    for (let i = 0; i < easyCount; i++) {
      await expect(restoredRows.nth(i).locator('.df')).toContainText('Easy');
    }

    // 5. Clean up: reset filter back to all
    await restoredFilterSel.selectOption('all');
    await expect(page.locator('.row')).toHaveCount(initialTotal);
  });
});
