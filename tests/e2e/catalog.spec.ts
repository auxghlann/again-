import { test, expect } from '@playwright/test';

test.describe('Catalog Responsiveness & Sidebar Retraction', () => {
  test('Code catalog expands fluidly when sidebar is collapsed', async ({ page }) => {
    await page.goto('/#/code');
    await expect(page.locator('#code-grid')).toBeVisible();

    const pageContainer = page.locator('.main .page');
    await expect(pageContainer).toBeVisible();

    // Measure initial width
    const initialBox = await pageContainer.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    // Collapse the sidebar
    const collapseBtn = page.locator('#sidebar-collapse-btn');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();

    // Verify grid layout class updated
    const appEl = page.locator('.app');
    await expect(appEl).toHaveClass(/grid-cols-\[64px_minmax\(0,1fr\)\]/);

    // Auto-retry until transition duration-200 completes and container expands
    await expect(async () => {
      const box = await pageContainer.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(initialWidth + 100);
    }).toPass({ timeout: 3000 });
  });

  test('Practice catalog expands fluidly when sidebar is collapsed', async ({ page }) => {
    await page.goto('/#/practice');
    await expect(page.locator('#practice-grid')).toBeVisible();

    const pageContainer = page.locator('.main .page');
    await expect(pageContainer).toBeVisible();

    // Measure initial width
    const initialBox = await pageContainer.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    // Collapse the sidebar
    const collapseBtn = page.locator('#sidebar-collapse-btn');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();

    // Verify grid layout class updated
    const appEl = page.locator('.app');
    await expect(appEl).toHaveClass(/grid-cols-\[64px_minmax\(0,1fr\)\]/);

    // Auto-retry until transition duration-200 completes and container expands
    await expect(async () => {
      const box = await pageContainer.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(initialWidth + 100);
    }).toPass({ timeout: 3000 });
  });

  test('Code catalog: dynamic language chips and search filter study plan cards', async ({ page }) => {
    await page.goto('/#/code');
    await expect(page.locator('#code-grid')).toBeVisible();

    const chips = page.locator('#code-chips button.chip');
    await expect(chips.first()).toBeVisible();
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2);

    const allChip = page.locator('#code-chips button.chip', { hasText: 'All' });
    await expect(allChip).toHaveClass(/\bon\b/);

    const initialCards = page.locator('#code-grid a.card');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Pick the first non-All language chip
    const targetChip = chips.nth(1);
    const targetLang = (await targetChip.innerText()).trim();
    await targetChip.click();

    await expect(targetChip).toHaveClass(/\bon\b/);

    // Verify displayed cards match selected language
    const filteredCards = page.locator('#code-grid a.card');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    for (let i = 0; i < filteredCount; i++) {
      await expect(filteredCards.nth(i).locator('.tool')).toContainText(targetLang);
    }

    // Filter using search box
    const searchInput = page.locator('#code-search');
    await searchInput.fill('Beginner');
    await searchInput.dispatchEvent('input');

    const searchCards = page.locator('#code-grid a.card');
    const searchCount = await searchCards.count();
    if (searchCount > 0) {
      await expect(searchCards.first()).toContainText(/Beginner/i);
    }

    // Reset search and restore All filter
    await searchInput.fill('');
    await searchInput.dispatchEvent('input');
    await allChip.click();
    await expect(allChip).toHaveClass(/\bon\b/);
    await expect(page.locator('#code-grid a.card')).toHaveCount(initialCount);
  });

  test('Practice catalog: dynamic topic chips and search filter practice cards', async ({ page }) => {
    await page.goto('/#/practice');
    await expect(page.locator('#practice-grid')).toBeVisible();

    const chips = page.locator('#practice-chips button.chip');
    await expect(chips.first()).toBeVisible();
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2);

    const allChip = page.locator('#practice-chips button.chip', { hasText: 'All' });
    await expect(allChip).toHaveClass(/\bon\b/);

    const initialCards = page.locator('#practice-grid a.card');
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Pick the first non-All topic chip
    const targetChip = chips.nth(1);
    const targetTopic = (await targetChip.innerText()).trim();
    await targetChip.click();

    await expect(targetChip).toHaveClass(/\bon\b/);

    // Verify displayed cards match selected topic
    const filteredCards = page.locator('#practice-grid a.card');
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    for (let i = 0; i < filteredCount; i++) {
      await expect(filteredCards.nth(i).locator('.tool')).toContainText(targetTopic);
    }

    // Filter using search box
    const searchInput = page.locator('#practice-search');
    await searchInput.fill('Warehouse');
    await searchInput.dispatchEvent('input');

    const searchCards = page.locator('#practice-grid a.card');
    const searchCount = await searchCards.count();
    if (searchCount > 0) {
      await expect(searchCards.first()).toContainText(/Warehouse/i);
    }

    // Reset search and restore All filter
    await searchInput.fill('');
    await searchInput.dispatchEvent('input');
    await allChip.click();
    await expect(allChip).toHaveClass(/\bon\b/);
    await expect(page.locator('#practice-grid a.card')).toHaveCount(initialCount);
  });

  test('Code catalog filter state persists across navigation', async ({ page }) => {
    await page.goto('/#/code');
    await expect(page.locator('#code-grid')).toBeVisible();

    const sqlChip = page.locator('#code-chips button.chip', { hasText: 'SQL' });
    await expect(sqlChip).toBeVisible();
    await sqlChip.click();
    await expect(sqlChip).toHaveClass(/\bon\b/);

    // Navigate to a study plan
    const firstCard = page.locator('#code-grid a.card').first();
    await firstCard.click();
    await expect(page.locator('#problem-list-container')).toBeVisible();

    // Navigate back to Code Library via breadcrumb
    const codeCrumb = page.locator('header.topbar nav[aria-label="Breadcrumbs"] a.crumb-link', { hasText: 'Code Library' });
    await expect(codeCrumb).toBeVisible();
    await codeCrumb.click();

    // Verify SQL chip remains active (.on)
    await expect(page).toHaveURL(/#\/code$/);
    const restoredSqlChip = page.locator('#code-chips button.chip', { hasText: 'SQL' });
    await expect(restoredSqlChip).toHaveClass(/\bon\b/);

    // Clean up: reset to All
    const allChip = page.locator('#code-chips button.chip', { hasText: 'All' });
    await allChip.click();
    await expect(allChip).toHaveClass(/\bon\b/);
  });
});
