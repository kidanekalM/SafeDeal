import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('dashboard responsive on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.mobile-menu')).toBeVisible();
    await expect(page.locator('nav button[aria-expanded]')).toBeVisible();
  });

  test('escrow creation stepper mobile', async ({ page }) => {
    await page.goto('/create-escrow');
    await expect(page.locator('.mobile-stepper')).toBeVisible();
    // Touch interactions
    await page.click('button[data-step="2"]');
  });
});

