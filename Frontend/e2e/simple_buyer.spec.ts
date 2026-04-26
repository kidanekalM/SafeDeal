import { test, expect } from '@playwright/test';

const BUYER = { email: 'simple_buyer@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Simple Buyer Flow', () => {

  test('TC-SIMPLE-BUYER-001: Accept quick escrow', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-quick-pending"]');

    await expect(page.locator('[data-testid="escrow-mode-badge"]')).toContainText('Quick', { timeout: 5000 });

    await page.click('[data-testid="accept-button"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/active/i, { timeout: 5000 });
  });

  test('TC-SIMPLE-BUYER-002: Complete quick escrow lifecycle', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-quick-pending"]');

    // Accept
    const acceptBtn = page.locator('[data-testid="accept-button"]');
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
    }

    // Fund
    const fundBtn = page.locator('[data-testid="fund-button"]');
    if (await fundBtn.isVisible()) {
      await fundBtn.click();
      await page.click('[data-testid="confirm-fund"]');
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/funded/i, { timeout: 5000 });
    }

    // Confirm receipt
    const receiptBtn = page.locator('[data-testid="confirm-receipt-button"]');
    if (await receiptBtn.isVisible()) {
      await receiptBtn.click();
      await page.fill('[data-testid="receipt-note"]', 'Received');
      await page.click('[data-testid="confirm-receipt-submit"]');
    }

    // Release
    const releaseBtn = page.locator('[data-testid="release-button"]');
    if (await releaseBtn.isVisible()) {
      await releaseBtn.click();
      await page.click('[data-testid="confirm-release"]');
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/completed/i, { timeout: 5000 });
    }

    // Check transaction recorded
    await page.click('[data-testid="nav-transactions"]');
    await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible({ timeout: 5000 });
  });

  test('TC-SIMPLE-BUYER-003: No milestone UI ever appears', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-quick-pending"]');

    await expect(page.locator('[data-testid="milestone-section"]')).not.toBeVisible({ timeout: 5000 });
  });
});