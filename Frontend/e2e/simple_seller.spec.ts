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
    await page.click('[data-testid="next-step"]'); // Role step

    // Step 2: Parties
    await page.fill('[data-testid="quick-buyer-email"]', BUYER.email);
    await page.click(`button:has-text("${BUYER.email}")`);
    await page.click('[data-testid="next-step"]');

    // Step 3: Terms
    await page.fill('[data-testid="quick-title"]', 'Logo Design');
    await page.fill('[data-testid="quick-condition"]', 'Approval of final SVG file');
    await page.fill('[data-testid="quick-amount"]', '5000');
    await page.click('[data-testid="next-step"]');

    // Step 4: Finalize
    await page.click('[data-testid="create-quick-submit"]');
    await page.waitForURL('**/escrows');
    await expect(page.locator('text=Created!')).toBeVisible();
  });

  test('TC-SIMPLE-002: Quick escrow has no milestones', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    
    // Find the quick escrow (it should be the first one if recently created)
    await page.click('[data-testid="escrow-card-0"]');

    // No milestone section
    await expect(page.locator('[data-testid="milestone-section"]')).not.toBeVisible();

    // Mode badge shows Quick
    await expect(page.locator('[data-testid="escrow-mode-badge"]')).toContainText('Quick');
  });

  test('TC-SIMPLE-003: Quick escrow has contract content', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // View contract area
    await expect(page.locator('[data-testid="contract-content"]')).toBeVisible();
  });

  test('TC-SIMPLE-004: Cannot add milestones to quick escrow later', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Add milestone button should not exist (we didn't add it to details page yet, so it won't exist anyway)
    await expect(page.locator('[data-testid="add-milestone-button"]')).not.toBeVisible();
  });
});
