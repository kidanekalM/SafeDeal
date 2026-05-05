import { test, expect } from '@playwright/test';

test.describe('Dispute & Arbitration Flows', () => {
  const testUser = 'test-account@safedeal.com';
  const password = 'Password123!';

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('user can raise dispute on active escrow', async ({ page }) => {
    await page.click('text=My Escrows');
    // Assume/click active escrow
    await page.locator('[data-testid="escrow-card"]:has-text("ACTIVE")').first().click();
    
    // Raise dispute
    await page.click('button:has-text("Raise Dispute")');
    await page.fill('textarea[placeholder*="reason"]', 'Service not delivered as agreed');
    await page.click('button:has-text("Submit Dispute")');
    
    await expect(page.locator('text=Dispute Raised')).toBeVisible();
    await expect(page.locator('text=IN_DISPUTE')).toBeVisible();
  });

  test('AI arbitration triggers on dispute', async ({ page }) => {
    await page.click('text=My Escrows');
    await page.locator('[data-testid="escrow-card"]:has-text("IN_DISPUTE")').first().click();
    
    // AI button
    await page.click('button:has-text("AI Resolve")');
    await expect(page.locator('text=Analyzing|Arbitrating')).toBeVisible({ timeout: 15000 });
    
    // Resolution outcome
    await expect(page.locator('text=Resolved|Released|Refunded')).toBeVisible({ timeout: 30000 });
  });

  test('dispute escalation to manual review', async ({ page }) => {
    // Similar flow, select manual option
    await page.click('button:has-text("Request Manual Review")');
    await expect(page.locator('text=Escalated|Pending Review')).toBeVisible();
  });
});

