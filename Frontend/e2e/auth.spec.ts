import { test, expect } from '@playwright/test';

const UI = 'http://localhost:3002';

test.describe.serial('Authentication', () => {
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
    await page.goto(`${UI}/login?mode=register`);

    // Step 1: Basic Info (all fields required by the backend)
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.fill('input[name="profession"]', 'Tester');
    await page.fill('input[name="phone_number"]', '+251911000000');
    await page.fill('input[name="email"]', randomEmail);
    await page.fill('input[name="password"]', password);

    await page.click('button:has-text("Next: Payout Details")');

    // Step 2: Payout Details
    await page.fill('input[name="account_name"]', 'John Doe');
    await page.selectOption('select[name="bank_code"]', '946'); // CBE
    await page.fill('input[name="account_number"]', '1000123456789');

    await page.click('button:has-text("Complete Registration")');

    // Should show success toast and switch back to login mode
    await expect(page.locator('text=Account created successfully'), { timeout: 15000 }).toBeVisible();
    await expect(page).toHaveURL(/.*login/);

    // The register form should have reset to login mode
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[name="first_name"]')).toBeHidden({ timeout: 5000 });
  });

  test('should login with the newly registered user', async ({ page }) => {
    await page.goto(`${UI}/login`);

    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', password);

    await page.click('button[type="submit"]:has-text("Sign In")');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Welcome', exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto(`${UI}/login`);
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Open the profile dropdown (desktop) then sign out
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/.*login/, { timeout: 20000 });
  });
});