import { test, expect } from '@playwright/test';

test.describe.serial('Authentication', () => {
  const randomEmail = `test-${Math.random().toString(36).substring(7)}@example.com`;
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
  });

  test('should register a new user', async ({ page }) => {
    // Listen for all network requests
    page.on('request', request => {
      if (request.url().includes('/register')) {
        console.log(`>> REGISTER REQUEST: ${request.method()} ${request.url()}`);
        console.log(`   PAYLOAD: ${request.postData()}`);
      }
    });
    
    // Listen for all network responses
    page.on('response', response => {
      if (response.url().includes('/register')) {
        console.log(`<< REGISTER RESPONSE: ${response.status()} ${response.url()}`);
        response.text().then(text => console.log(`   BODY: ${text}`)).catch(() => {});
      }
    });

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
    await expect(page.locator('text=Account created successfully'), { timeout: 15000 }).toBeVisible();
    await expect(page).toHaveURL(/.*login/);
  });

  test('should login with existing user', async ({ page }) => {
    // Listen for login responses
    page.on('response', response => {
      if (response.url().includes('/login')) {
        console.log(`<< LOGIN RESPONSE: ${response.status()} ${response.url()}`);
        response.text().then(text => console.log(`   BODY: ${text}`)).catch(() => {});
      }
    });

    await page.goto('/login');

    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', password);
    
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Welcome', exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // Logout
    await page.getByRole('button', { name: 'Sign out' }).first().click();
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});
