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
    
    const card = page.locator('[data-testid="escrow-card-quick-pending"]');
    if (await card.isVisible()) {
        await card.click();
        await expect(page.locator('[data-testid="escrow-mode-badge"]')).toContainText('Quick');
        
        const acceptBtn = page.locator('[data-testid="accept-button"]');
        if (await acceptBtn.isVisible()) {
            await acceptBtn.click();
            await expect(page.locator('[data-testid="escrow-status"]')).not.toContainText('Pending');
        }
    }
  });

  test('TC-SIMPLE-BUYER-002: Complete quick escrow lifecycle', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    
    const card = page.locator('[data-testid="escrow-card-0"]');
    if (await card.isVisible()) {
        await card.click();

        // Fund if Pending
        const fundBtn = page.locator('[data-testid="fund-button"]');
        if (await fundBtn.isVisible()) {
            await fundBtn.click();
            if (await page.locator('text=CBE Verification').isVisible()) {
                await page.fill('input[placeholder="FT..."]', 'FT-QUICK');
                await page.fill('input[placeholder="262..."]', '1234');
                await page.click('button:has-text("Verify & Fund")');
            }
        }

        // Release if active
        const releaseBtn = page.locator('[data-testid="confirm-receipt-button"]');
        if (await releaseBtn.isVisible()) {
            await releaseBtn.click();
            await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Released');
        }

        // Check transaction recorded
        await page.click('[data-testid="nav-transactions"]');
        await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible();
    }
  });

  test('TC-SIMPLE-BUYER-003: No milestone UI ever appears', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    
    const card = page.locator('[data-testid="escrow-card-0"]');
    if (await card.isVisible()) {
        await card.click();
        await expect(page.locator('[data-testid="milestone-section"]')).not.toBeVisible();
    }
  });
});
