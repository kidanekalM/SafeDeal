import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Use admin user for dashboard checks
  const email = 'test-account@safedeal.com';
  const password = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Bypass language modal and guided tour
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display stats and welcome message', async ({ page }) => {
    await expect(page.locator('text=Welcome')).toBeVisible();
    
    // Check if stats grid exists
    const statsGrid = page.locator('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
    await expect(statsGrid).toBeVisible();
  });

  test('should navigate to create escrow page', async ({ page }) => {
    await page.click('text=Start New Deal');
    await expect(page).toHaveURL(/.*create-escrow/);
    await expect(page.locator('text=New SafeDeal')).toBeVisible();
  });

  test('should navigate to profile page', async ({ page }) => {
    await page.click('text=Profile');
    await expect(page).toHaveURL(/.*profile/);
    await expect(page.locator('text=Profile Settings')).toBeVisible();
  });
});
