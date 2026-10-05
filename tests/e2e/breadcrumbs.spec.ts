import { test, expect } from '@playwright/test';

test.describe('Clickable Topbar Breadcrumbs Navigation', () => {
  test('clicking Practice Library crumb in quiz view navigates to practice catalog', async ({ page }) => {
    // Navigate directly to a quiz session
    await page.goto('/#/quiz/sql-basics');

    // Wait for quiz content to load
    await expect(page.locator('.qz-page')).toBeVisible({ timeout: 10000 });

    // Verify breadcrumbs landmark
    const nav = page.locator('header.topbar nav[aria-label="Breadcrumbs"]');
    await expect(nav).toBeVisible();

    // Verify parent breadcrumb link exists with correct href and attributes
    const practiceCrumb = nav.locator('a.crumb-link', { hasText: 'Practice Library' });
    await expect(practiceCrumb).toBeVisible();
    await expect(practiceCrumb).toHaveAttribute('href', '#/practice');

    // Verify active leaf has aria-current="page"
    const currentCrumb = nav.locator('[aria-current="page"]');
    await expect(currentCrumb).toBeVisible();

    // Click breadcrumb link
    await practiceCrumb.click();

    // Verify navigation back to practice catalog
    await expect(page).toHaveURL(/#\/practice$/);
    await expect(page.locator('#practice-grid')).toBeVisible();
  });

  test('clicking Code Library crumb in study plan view navigates to code catalog', async ({ page }) => {
    // Navigate directly to a study plan
    await page.goto('/#/plans/sql-beginner');

    // Wait for study plan content to load
    await expect(page.locator('#problem-list-container')).toBeVisible({ timeout: 10000 });

    // Verify breadcrumbs landmark
    const nav = page.locator('header.topbar nav[aria-label="Breadcrumbs"]');
    await expect(nav).toBeVisible();

    // Verify parent breadcrumb link exists with correct href
    const codeCrumb = nav.locator('a.crumb-link', { hasText: 'Code Library' });
    await expect(codeCrumb).toBeVisible();
    await expect(codeCrumb).toHaveAttribute('href', '#/code');

    // Click breadcrumb link
    await codeCrumb.click();

    // Verify navigation back to code catalog
    await expect(page).toHaveURL(/#\/code$/);
    await expect(page.locator('#code-grid')).toBeVisible();
  });
});
