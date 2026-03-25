import { test, expect } from '@playwright/test';

test.describe('Escrow Creation Flows', () => {
  const email = 'jtime5115@gmail.com';
  const password = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Bypass language modal and guided tour
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
      window.localStorage.setItem('access_token', 'mock_token'); // We might need a real login if the backend is running
    });

    await page.goto('/login');
    // Actual login is better if backend is up
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should complete the Quick Escrow flow', async ({ page }) => {
    await page.click('text=Start New Deal');
    await expect(page).toHaveURL(/.*create-escrow/);

    // Step 1: Role & Type (Quick Escrow is default)
    await page.click('button:has-text("Continue")');

    // Step 2: Parties
    await page.fill('input[placeholder="Search by name or email..."]', 'test');
    await page.waitForSelector('button:has-text("test")', { timeout: 5000 });
    await page.locator('button:has-text("test")').first().click();
    
    // Verify user is selected (selectedCounterparty state)
    await expect(page.locator('button >> .lucide-trash2')).toBeVisible();
    await page.click('button:has-text("Continue")');

    // Step 3: Terms (Added in my previous fix)
    await page.fill('textarea[name="conditions"]', 'Quick Escrow Terms - This is a test deal with more than ten characters.');
    await page.fill('input[name="amount"]', '750');
    await page.click('button:has-text("Continue")');

    // Step 4: Finalize
    await expect(page.locator('text=Quick Escrow Terms')).toBeVisible();
    await page.click('button:has-text("Start Secure Escrow")');

    // Should redirect to escrows list
    await expect(page).toHaveURL(/.*escrows/);
    await expect(page.locator('text=Escrow created successfully')).toBeVisible();
  });

  test('should complete the Ultra Comprehensive flow', async ({ page }) => {
    test.slow();
    await page.click('text=Start New Deal');
    
    // Step 1: Role & Type
    // Select Ultra Comprehensive
    await page.click('text=Ultra Comprehensive');
    await page.click('button:has-text("Continue")');

    // Step 2: Parties
    await page.fill('input[placeholder="Search by name or email..."]', 'test');
    await page.waitForSelector('button:has-text("test")', { timeout: 5000 });
    await page.locator('button:has-text("test")').first().click();
    await page.click('button:has-text("Continue")');

    // Step 3: Terms
    await page.fill('textarea[name="conditions"]', 'Comprehensive Escrow Terms - This is a detailed test deal for the ultra comprehensive route.');
    // Amount should be read-only or at least we should see the milestone sync message
    await expect(page.locator('text=Auto-synced with milestones')).toBeVisible();
    await page.click('button:has-text("Continue")');

    // Step 4: Milestones
    // First milestone is added by default
    await page.fill('input[placeholder="Milestone Title"]', 'Design Phase');
    await page.fill('input[placeholder="Amount"]', '1000');
    
    // Add second milestone
    await page.click('button:has-text("Add")');
    await page.locator('input[placeholder="Milestone Title"]').nth(1).fill('Development Phase');
    await page.locator('input[placeholder="Amount"]').nth(1).fill('2000');
    
    // Check total
    await expect(page.locator('text=3,000 ETB')).toBeVisible();
    await page.click('button:has-text("Continue")');

    // Step 5: Finalize
    await expect(page.locator('text=3,000 ETB')).toBeVisible();
    await expect(page.locator('text=Comprehensive Escrow Terms')).toBeVisible();
    
    await page.click('button:has-text("Start Secure Escrow")');

    // Should redirect to escrows list
    await expect(page).toHaveURL(/.*escrows/);
    await expect(page.locator('text=Escrow created successfully')).toBeVisible();
  });
});
