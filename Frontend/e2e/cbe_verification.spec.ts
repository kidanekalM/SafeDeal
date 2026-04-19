import { test, expect } from '@playwright/test';

test.describe('CBE Verification E2E Flow', () => {
  const buyerEmail = 'test-account@safedeal.com'; // Use existing test user
  const password = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Debugging: Log all console messages from the page
    page.on('console', msg => {
      console.log(`PAGE CONSOLE: [${msg.type()}] ${msg.text()}`);
    });

    // Bypass language modal and guided tour
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test('should fund escrow via CBE Direct Verify', async ({ page }) => {
    // 1. Create a new escrow
    await page.click('text=Start New Deal');
    await expect(page).toHaveURL(/.*create-escrow/);
    await page.click('button:has-text("Continue")'); // Role & Type
    
    // Select counterparty
    await page.fill('input[placeholder="Search by name or email..."]', 'ai@gmail.com');
    await page.waitForTimeout(2000);
    await page.locator('button:has-text("AI")').first().click();
    await expect(page.locator('button >> .lucide-trash2').first()).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Continue")');

    // Terms
    await page.fill('textarea[name="conditions"]', 'CBE Verification Flow Test - Scraped Receipt');
    await page.fill('input[name="amount"]', '100'); // Match receipt amount
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Start Secure Escrow")');

    // 2. Navigate to Escrow Details
    await expect(page).toHaveURL(/.*escrows/);
    await page.locator('[class*="cursor-pointer"]').first().click();
    await expect(page).toHaveURL(/\/escrow\/\d+/);

    // 3. Perform CBE Verification
    await page.click('button:has-text("CBE Direct Verify")');
    
    // Fill details
    await page.fill('input[placeholder="FT..."]', 'FT26072JFV9');
    await page.fill('input[placeholder="262..."]', '262856058');
    
    // Submit
    await page.click('button:has-text("Verify & Fund")');

    // 4. Assert Funding
    await expect(page.locator('text=Payment verified successfully')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=Funded')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Funds Secured')).toBeVisible();
    await expect(page.locator('button:has-text("CBE Direct Verify")')).not.toBeVisible();
  });
});
