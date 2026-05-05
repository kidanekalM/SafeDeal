import { test, expect } from '@playwright/test';

test.describe('Full Milestone Lifecycle', () => {
  test('detailed escrow with multi-milestone completion/release', async ({ page }) => {
    // Login & create detailed escrow (reuse escrow_flows logic)
    // ... abbreviated for full test suite

    // Mark milestones complete
    await page.locator('.milestone:has-text("Design") button:has-text("Complete")').click();
    await expect(page.locator('text=Completed')).toBeVisible();

    // Partial release
    await page.click('button:has-text("Release Milestone")');
    await expect(page.locator('text=Released')).toBeVisible();

    // Final full release
    await page.locator('.final-release').click();
    await expect(page.locator('text=Escrow Completed')).toBeVisible();
  });
});

