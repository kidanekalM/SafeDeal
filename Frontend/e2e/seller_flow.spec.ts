import { test, expect } from '@playwright/test';

const SELLER = { email: 'seller@test.com', password: 'Test123!' };
const BUYER = { email: 'buyer@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Seller Flow', () => {

  test('TC-SELLER-001: Create detailed escrow with milestones', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);

    await page.click('[data-testid="create-escrow-button"]');
    await page.click('[data-testid="detailed-mode-option"]');

    // Step 1: Parties
    await page.fill('[data-testid="escrow-title"]', 'Website Redesign');
    await page.fill('[data-testid="escrow-description"]', 'Complete redesign of 10 pages');
    await page.fill('[data-testid="buyer-email"]', BUYER.email);
    await page.click('[data-testid="next-step"]');

    // Step 2: Payment
    await page.fill('[data-testid="escrow-amount"]', '50000');
    await page.click('[data-testid="next-step"]');

    // Step 3: Milestones
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-name-0"]', 'Design Phase');
    await page.fill('[data-testid="milestone-amount-0"]', '20000');
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-name-1"]', 'Development');
    await page.fill('[data-testid="milestone-amount-1"]', '30000');
    await page.click('[data-testid="next-step"]');

    // Step 4: Review and submit
    await page.click('[data-testid="create-escrow-submit"]');
    await expect(page.locator('[data-testid="escrow-created-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-SELLER-002: Seller cannot fund or release before buyer actions', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);

    // Navigate to first escrow
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Fund button should be disabled for seller
    const fundBtn = page.locator('[data-testid="fund-button"]');
    if (await fundBtn.isVisible()) {
      await expect(fundBtn).toBeDisabled();
    }

    // Release button should be disabled
    const releaseBtn = page.locator('[data-testid="release-button"]');
    if (await releaseBtn.isVisible()) {
      await expect(releaseBtn).toBeDisabled();
    }
  });

  test('TC-SELLER-003: Escrow becomes locked and uneditable after buyer acceptance', async ({ page }) => {
    // Login as buyer, accept, and fund the escrow created above
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Accept
    await page.click('[data-testid="accept-button"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/active/i, { timeout: 5000 });

    // Fund
    await page.click('[data-testid="fund-button"]');
    await page.click('[data-testid="confirm-fund"]');

    // Now login as seller and verify cannot edit
    await page.click('[data-testid="logout-button"]');
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Edit button should not be visible when locked
    await expect(page.locator('[data-testid="edit-escrow-button"]')).not.toBeVisible({ timeout: 5000 });
  });
});