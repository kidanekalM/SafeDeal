import { test, expect } from '@playwright/test';

test.describe('Blockchain Integration Tests', () => {
  test('verify escrow tx hash and contract state on details page', async ({ page }) => {
    // Login & navigate to escrow with blockchain data
    await page.goto('/login');
    // ... login code
    await page.goto('/escrow/1'); // Assume ID with tx

    // Verify tx hash displayed & clickable
    await expect(page.locator('text=0x[a-fA-F0-9]{64}')).toBeVisible(); // Hash pattern
    await expect(page.locator('text=Etherscan')).toBeVisible();

    // Contract events log
    await expect(page.locator('text=Event Log')).toBeVisible();
    await expect(page.locator('text=Funded|Released')).toBeVisible();
  });

  test('wallet connect & sign for release', async ({ page }) => {
    await page.click('button:has-text("Connect Wallet")');
    // Mock wallet approval
    await page.click('button:has-text("Sign")');
    await expect(page.locator('text=Signed')).toBeVisible();
  });
});

