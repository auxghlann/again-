import { test, expect } from '@playwright/test';

test.describe('Catalog Responsiveness & Sidebar Retraction', () => {
  test('Code catalog expands fluidly when sidebar is collapsed', async ({ page }) => {
    await page.goto('/#/code');
    await expect(page.locator('#code-grid')).toBeVisible();

    const pageContainer = page.locator('.main .page');
    await expect(pageContainer).toBeVisible();

    // Verify max-w-6xl class is removed and w-full is applied
    const classes = await pageContainer.getAttribute('class');
    expect(classes).toContain('w-full');
    expect(classes).not.toContain('max-w-6xl');

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

    // Verify max-w-6xl class is removed and w-full is applied
    const classes = await pageContainer.getAttribute('class');
    expect(classes).toContain('w-full');
    expect(classes).not.toContain('max-w-6xl');

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
});
