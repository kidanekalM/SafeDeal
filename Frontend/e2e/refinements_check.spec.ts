import { test, expect } from '@playwright/test';

// Test Suite: Refinements Verification
// Covers: Registration, Search, Escrow Flow, Profile Menu

test.describe('SafeDeal System Refinements', () => {

  test('Registration includes phone number', async ({ page }) => {
    await page.goto('/auth');
    await page.click('text=Create new account');
    // Verify phone number field exists
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });

  test('Search triggers on every character', async ({ page }) => {
    // Requires login
    await page.goto('/auth');
    await page.fill('[data-testid="email-input"]', 'kid2@gmail.com');
    await page.fill('[data-testid="password-input"]', '12345678');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');

    await page.click('[data-testid="create-escrow-button"]');
    await page.click('[data-testid="next-step"]'); // Skip role
    await page.click('[data-testid="next-step"]'); // Skip mediation
    
    // Search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('k');
    // Verify results show up immediately (mocking search result check)
    await expect(page.locator('.absolute.z-10')).toBeVisible();
  });

  test('Logout is in dropdown', async ({ page }) => {
    await page.goto('/dashboard');
    // Profile menu button
    await page.click('button[aria-label="User menu"]');
    // Verify Sign Out is in dropdown
    await expect(page.locator('text=Sign Out')).toBeVisible();
  });

  test('Create Detailed Escrow syncs amount from milestones', async ({ page }) => {
    await page.goto('/create-escrow');
    // Skip to detailed
    await page.click('[data-testid="detailed-mode-option"]');
    await page.click('[data-testid="next-step"]'); // Skip mediation
    await page.click('[data-testid="next-step"]'); // Skip parties
    
    // Milestones
    await page.fill('[data-testid="milestone-amount-0"]', '1000');
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-amount-1"]', '2000');
    
    // Amount should be 3000
    const amountInput = page.locator('[data-testid="escrow-amount"]');
    await expect(amountInput).toHaveValue('3000');
  });

  test('Escrow details show Tamper-Proof Record', async ({ page }) => {
    await page.goto('/escrows');
    await page.click('[data-testid="escrow-card-0"]');
    await expect(page.locator('text=Tamper-Proof Record')).toBeVisible();
    await expect(page.locator('.font-mono.text-\\[9px\\]')).toBeVisible();
  });

});
