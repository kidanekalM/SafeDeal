import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const randomEmail = `test-${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Bypass language modal and guided tour
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/login?mode=register');

    // Step 1: Basic Info
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="profession"]', 'Tester');
    await page.fill('input[name="email"]', randomEmail);
    await page.fill('input[name="password"]', password);
    
    await page.click('button:has-text("Next: Payout Details")');

    // Step 2: Payout Details
    await page.fill('input[name="account_name"]', 'John Doe');
    await page.selectOption('select[name="bank_code"]', '946'); // CBE
    await page.fill('input[name="account_number"]', '1000123456789');
    
    await page.click('button:has-text("Complete Registration")');

    // Should show success toast and stay on login
    await expect(page.locator('text=Account created successfully')).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });

  test('should login with existing user', async ({ page }) => {
    await page.goto('/login');

    // Assuming we use the user created above or a known test user
    // For local tests, we might need a dedicated test account
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', password);
    
    await page.click('button:has-text("Login")');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL(/.*dashboard/);

    // Logout
    await page.click('button:has-text("Log Out")');
    await expect(page).toHaveURL(/.*login/);
  });
});
