import { test, expect } from '@playwright/test';

test.describe('Escrow Creation', () => {
  const email = 'jtime5115@gmail.com';
  const password = 'Password123!';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create a Quick Escrow', async ({ page }) => {
    await page.click('text=Start New Deal');
    await expect(page).toHaveURL(/.*create-escrow/);

    // Step 1: Role (Buyer is default)
    await page.click('button:has-text("Continue")');

    // Step 2: Parties
    // Search for a user (e.g., 'test')
    await page.fill('input[placeholder="Search by name or email..."]', 'test');
    // Wait for search results
    await page.waitForTimeout(1000); 
    const firstResult = page.locator('button:has-text("test")').first();
    await firstResult.click();
    
    await page.click('button:has-text("Continue")');

    // Step 3: Finalize (Quick Escrow skips Details/Milestones)
    await page.fill('textarea[name="conditions"]', 'Test Quick Escrow Terms - This is a test deal.');
    await page.fill('input[name="amount"]', '500');
    
    await page.click('button:has-text("Start Secure Escrow")');

    // Should redirect to escrows list
    await expect(page).toHaveURL(/.*escrows/);
    await expect(page.locator('text=Escrow created successfully')).toBeVisible();
  });

  test('should show risk warning for high amounts', async ({ page }) => {
    await page.click('text=Start New Deal');
    await page.click('button:has-text("Continue")'); // Skip to Parties
    
    // Select counterparty
    await page.fill('input[placeholder="Search by name or email..."]', 'test');
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("test")').first().click();
    await page.click('button:has-text("Continue")');

    // Enter high amount
    await page.fill('input[name="amount"]', '15000');
    await expect(page.locator('text=AI Risk Warning')).toBeVisible();
  });
});
