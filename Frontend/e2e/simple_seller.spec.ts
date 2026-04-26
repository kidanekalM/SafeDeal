import { test, expect } from '@playwright/test';

const SELLER = { email: 'simple_seller@test.com', password: 'Test123!' };
const BUYER = { email: 'simple_buyer@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Simple Seller Flow', () => {

  test('TC-SIMPLE-001: Create quick escrow with minimal fields', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);

    await page.click('[data-testid="create-escrow-button"]');
    await page.click('[data-testid="quick-mode-option"]');

    // Fill minimal form
    await page.fill('[data-testid="quick-title"]', 'Logo Design');
    await page.fill('[data-testid="quick-amount"]', '5000');
    await page.fill('[data-testid="quick-buyer-email"]', BUYER.email);
    await page.selectOption('[data-testid="quick-condition"]', 'approval');
    await page.click('[data-testid="create-quick-submit"]');

    await expect(page.locator('[data-testid="escrow-created-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-SIMPLE-002: Quick escrow has no milestones', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // No milestone section
    await expect(page.locator('[data-testid="milestone-section"]')).not.toBeVisible({ timeout: 5000 });

    // Mode badge shows Quick
    await expect(page.locator('[data-testid="escrow-mode-badge"]')).toContainText('Quick', { timeout: 5000 });
  });

  test('TC-SIMPLE-003: Quick escrow has auto-generated terms', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // View contract
    await page.click('[data-testid="view-contract-button"]');
    await expect(page.locator('[data-testid="contract-content"]')).toContainText(/auto-generated/i, { timeout: 5000 });
  });

  test('TC-SIMPLE-004: Cannot add milestones to quick escrow later', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Add milestone button should not exist
    await expect(page.locator('[data-testid="add-milestone-button"]')).not.toBeVisible({ timeout: 5000 });
  });
});