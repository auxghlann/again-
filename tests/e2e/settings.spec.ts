import { test, expect } from '@playwright/test';

test.describe('Settings Modal & Theme Switching', () => {
  test('gear button opens settings modal with theme switcher and diagnostics', async ({ page }) => {
    await page.goto('/');

    const gearBtn = page.locator('#gear-btn');
    await expect(gearBtn).toBeVisible();

    // Verify touch target size >= 36px
    const gearBox = await gearBtn.boundingBox();
    expect(gearBox).not.toBeNull();
    expect(gearBox!.width).toBeGreaterThanOrEqual(36);
    expect(gearBox!.height).toBeGreaterThanOrEqual(36);

    // Open settings modal
    await gearBtn.click();

    const backdrop = page.locator('#settings-modal-backdrop');
    await expect(backdrop).toBeVisible();

    const title = page.locator('#settings-dialog-title');
    await expect(title).toHaveText('Workspace Settings');

    // Switch to light theme
    const lightBtn = page.locator('#theme-btn-light');
    await lightBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(lightBtn).toHaveAttribute('aria-checked', 'true');

    // Switch to dark theme
    const darkBtn = page.locator('#theme-btn-dark');
    await darkBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(darkBtn).toHaveAttribute('aria-checked', 'true');

    // Test Escape key dismissal
    await page.keyboard.press('Escape');
    await expect(backdrop).not.toBeVisible();

    // Reopen and test diagnostics and Done button dismissal
    await gearBtn.click();
    await expect(backdrop).toBeVisible();

    // Verify environment diagnostics cards
    await expect(page.locator('#settings-modal-backdrop')).toContainText('FastAPI Backend Service');
    await expect(page.locator('#settings-modal-backdrop')).toContainText('Application Database');
    await expect(page.locator('#settings-modal-backdrop')).toContainText('Execution Runner Sandbox');

    // Test Re-check diagnostics button
    const refreshBtn = page.locator('#refresh-diagnostics-btn');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(page.locator('#settings-modal-backdrop')).toContainText('Online');

    const doneBtn = page.locator('#settings-done-btn');
    await doneBtn.click();
    await expect(backdrop).not.toBeVisible();
  });

  test('topbar does not render API status dot or API Offline label', async ({ page }) => {
    await page.goto('/');
    const statusDot = page.locator('#shell-status-dot');
    await expect(statusDot).toHaveCount(0);

    const statusLabel = page.locator('#shell-status-label');
    await expect(statusLabel).toHaveCount(0);

    const topbar = page.locator('header.topbar');
    await expect(topbar).not.toContainText('API Offline');
    await expect(topbar).not.toContainText('API Online');
  });
});
