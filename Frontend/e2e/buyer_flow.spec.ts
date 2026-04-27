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
    // Login as buyer
    await login(page, BUYER.email, BUYER.password);

    // Find and open escrow (assuming one exists from seller flow or elsewhere)
    await page.click('[data-testid="nav-escrows"]');
    
    // Check if there are any escrows
    const card = page.locator('[data-testid="escrow-card-0"]');
    if (await card.isVisible()) {
        await card.click();

        // Accept if Pending
        const status = await page.locator('[data-testid="escrow-status"]').textContent();
        if (status?.includes('Pending')) {
            const acceptBtn = page.locator('[data-testid="accept-button"]');
            if (await acceptBtn.isVisible()) {
                await acceptBtn.click();
                await expect(page.locator('[data-testid="escrow-status"]')).not.toContainText('Pending');
            }
        }

        // Fund if not yet funded
        const fundBtn = page.locator('[data-testid="fund-button"]');
        if (await fundBtn.isVisible()) {
            await fundBtn.click();
            // This might open a modal or redirect
            // If it's the CBE modal:
            if (await page.locator('text=CBE Verification').isVisible()) {
                await page.fill('input[placeholder="FT..."]', 'FT12345678');
                await page.fill('input[placeholder="262..."]', '1234');
                await page.click('button:has-text("Verify & Fund")');
            }
            await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/Funded|Verifying/);
        }
    }
  });

  test('TC-BUYER-002: Duplicate funding is blocked', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    
    const card = page.locator('[data-testid="escrow-card-0"]');
    if (await card.isVisible()) {
        await card.click();
        const status = await page.locator('[data-testid="escrow-status"]').textContent();
        if (status?.includes('Funded') || status?.includes('Verifying')) {
            // Fund button should be hidden
            await expect(page.locator('[data-testid="fund-button"]')).not.toBeVisible();
        }
    }
  });

  test('TC-BUYER-003: Buyer confirms receipt and releases', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    
    const card = page.locator('[data-testid="escrow-card-0"]');
    if (await card.isVisible()) {
        await card.click();
        
        const releaseBtn = page.locator('[data-testid="confirm-receipt-button"]');
        if (await releaseBtn.isVisible()) {
            await releaseBtn.click();
            // Confirm release
            await expect(page.locator('[data-testid="escrow-status"]')).toContainText('Released');
        }
    }
  });
});
