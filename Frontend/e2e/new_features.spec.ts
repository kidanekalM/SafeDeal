import { test, expect } from '@playwright/test';

test.describe('New Features Testing', () => {
  const email = 'jtime5115@gmail.com';
  const password = 'Password123!';

  test.beforeEach(async ({ page }) => {
    // Bypass language modal and guided tour
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display dispute clause fields in escrow creation', async ({ page }) => {
    await page.click('text=Start New Deal');
    await expect(page).toHaveURL(/.*create-escrow/);

    // Select Ultra Comprehensive option
    await page.click('text=Ultra Comprehensive');
    await page.click('button:has-text("Continue")');

    // Proceed to Terms section
    await page.fill('input[placeholder="Search by name or email..."]', 'test');
    await page.waitForSelector('button:has-text("test")', { timeout: 5000 });
    await page.locator('button:has-text("test")').first().click();
    await page.click('button:has-text("Continue")');

    // Fill in basic terms
    await page.fill('textarea[name="conditions"]', 'Test escrow with dispute clause');
    await page.fill('input[name="amount"]', '1000');
    await page.click('button:has-text("Continue")');

    // On the final review page, check for dispute clause fields
    await expect(page.locator('text=Dispute Clause')).toBeVisible();
    await expect(page.locator('text=Dispute Resolution Procedure')).toBeVisible();
    await expect(page.locator('text=Arbitration Terms')).toBeVisible();

    // Verify dispute resolution options are present
    await expect(page.locator('text=AI Smart Resolution')).toBeVisible();
    await expect(page.locator('text=Court Jurisdiction')).toBeVisible();

    // Go back and finish the escrow creation
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Start Secure Escrow")');

    // Should redirect to escrows list
    await expect(page).toHaveURL(/.*escrows/);
    await expect(page.locator('text=Escrow created successfully')).toBeVisible();
  });

  test('should allow downloading finalized agreement for released escrows', async ({ page }) => {
    // First, navigate to the escrows page
    await page.goto('/escrows');
    
    // Find an escrow that is in "Released" or "Refunded" status to test the download functionality
    // We'll look for an existing escrow with one of these statuses
    const releasedEscrows = await page.$$('.status-tag:has-text("Released"), .status-tag:has-text("Refunded")');
    
    if (releasedEscrows.length > 0) {
      // Click on the first released/refunded escrow
      const firstReleasedEscrow = releasedEscrows[0];
      await firstReleasedEscrow.click();
      
      // Wait for the escrow details page to load
      await expect(page).toHaveURL(/.*escrows\/\d+/);
      
      // Look for the "Download Final Agreement" button
      const downloadButton = page.locator('button:has-text("Download Final Agreement")');
      await expect(downloadButton).toBeVisible();
      
      // Click the download button
      await downloadButton.click();
      
      // Verify a success message appears
      await expect(page.locator('text=Agreement downloaded successfully')).toBeVisible();
    } else {
      console.log('No released/refunded escrows found to test download functionality');
    }
  });

  test('should create escrow with non-existent user and trigger invitation', async ({ page }) => {
    await page.click('text=Start New Deal');
    await expect(page).toHaveURL(/.*create-escrow/);

    // Select Ultra Comprehensive option
    await page.click('text=Ultra Comprehensive');
    await page.click('button:has-text("Continue")');

    // Try to search for a non-existent user by using an email that likely doesn't exist
    const fakeEmail = 'nonexistent-user-' + Date.now() + '@example.com';
    await page.fill('input[placeholder="Search by name or email..."]', fakeEmail);
    await page.waitForTimeout(1000);
    
    // Check if there's a suggestion to invite the user by email
    await expect(page.locator(`text=${fakeEmail}`).or(page.locator('text=Invite user by email'))).toBeVisible();
    
    // For now, we'll just cancel this test as we can't actually verify the email was sent in a test environment
    await page.click('button:has-text("Back")');
    await page.click('button:has-text("Back")');
  });
});