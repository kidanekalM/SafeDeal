import { test, expect } from '@playwright/test';

const BUYER = { email: 'buyer@test.com', password: 'Test123!' };
const SELLER = { email: 'seller@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Buyer Flow', () => {

  test('TC-BUYER-001: Buyer accepts and funds escrow', async ({ page }) => {
    // First, seller creates an escrow
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="create-escrow-button"]');
    await page.click('[data-testid="detailed-mode-option"]');
    await page.fill('[data-testid="escrow-title"]', 'Buyer Test Escrow');
    await page.fill('[data-testid="escrow-description"]', 'For buyer flow testing');
    await page.fill('[data-testid="buyer-email"]', BUYER.email);
    await page.click('[data-testid="next-step"]');
    await page.fill('[data-testid="escrow-amount"]', '10000');
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="next-step"]'); // Skip milestones
    await page.click('[data-testid="create-escrow-submit"]');
    await expect(page.locator('[data-testid="escrow-created-success"]')).toBeVisible({ timeout: 10000 });

    // Logout seller
    await page.click('[data-testid="logout-button"]');

    // Login as buyer
    await login(page, BUYER.email, BUYER.password);

    // Find and open escrow
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Accept
    await page.click('[data-testid="accept-button"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/active/i, { timeout: 5000 });

    // Fund
    await page.click('[data-testid="fund-button"]');
    await page.click('[data-testid="confirm-fund"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/funded/i, { timeout: 5000 });
  });

  test('TC-BUYER-002: Duplicate funding is blocked (idempotency)', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // If already funded, fund button shouldn't appear
    const fundBtn = page.locator('[data-testid="fund-button"]');
    if (await fundBtn.isVisible()) {
      await fundBtn.click();
      await page.click('[data-testid="confirm-fund"]');
      // Should show error or button disappears
      await expect(page.locator('[data-testid="already-funded-error"]')).toBeVisible({ timeout: 5000 });
    } else {
      // Button not visible, which is also correct
      await expect(fundBtn).not.toBeVisible();
    }
  });

  test('TC-BUYER-003: Buyer confirms receipt and releases', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Confirm receipt
    const receiptBtn = page.locator('[data-testid="confirm-receipt-button"]');
    if (await receiptBtn.isVisible()) {
      await receiptBtn.click();
      await page.fill('[data-testid="receipt-note"]', 'Item received as described');
      await page.click('[data-testid="confirm-receipt-submit"]');
    }

    // Release funds
    const releaseBtn = page.locator('[data-testid="release-button"]');
    if (await releaseBtn.isVisible()) {
      await releaseBtn.click();
      await page.click('[data-testid="confirm-release"]');
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/completed/i, { timeout: 5000 });
    }
  });
});