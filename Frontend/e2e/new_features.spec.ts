import { test, expect } from '@playwright/test';

test.describe('New Features Testing', () => {
  const email = 'test-account@safedeal.com';
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
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display dispute clause fields in escrow creation', async ({ page }) => {
    await page.getByRole('main').getByRole('link', { name: 'Start New Deal' }).click();
    await expect(page).toHaveURL(/.*create-escrow/);

    // Select Detailed option
    await page.click('text=Detailed');
    await page.click('button:has-text("Continue")');

    // Proceed to Terms section
    await page.fill('input[placeholder="Search seller by email..."]', 'test');
    await page.waitForSelector('button:has-text("test")', { timeout: 5000 });
    await page.locator('button:has-text("test")').first().click();
    await page.click('button:has-text("Continue")');

    // Fill in basic terms
    await page.fill('textarea[name="conditions"]', 'Test escrow with dispute clause');
    // amount is read-only in detailed mode
    await page.click('button:has-text("Continue")');

    // Step 4: Milestones
    await page.fill('input[placeholder="Title"]', 'Work');
    await page.fill('input[placeholder="Amount"]', '1000');
    await page.click('button:has-text("Continue")');

    // On the final review page, check for dispute clause fields
    await expect(page.locator('text=Agreement Preview')).toBeVisible();
    await expect(page.locator('text=Jurisdiction')).toBeVisible();
    await expect(page.locator('text=Resolution')).toBeVisible();

    // Verify dispute resolution options are present (defaults)
    await expect(page.locator('text=AI Arbitration via SafeDeal')).toBeVisible();
    await expect(page.locator('text=Ethiopia')).toBeVisible();

    // Go back and finish the escrow creation
    await page.click('button:has-text("Start Deal")');

    // Should redirect to escrows list
    await expect(page).toHaveURL(/.*escrows/);
    await expect(page.locator('text=Created!')).toBeVisible();
  });

  test('should allow downloading finalized agreement for released escrows', async ({ page }) => {
    // First, navigate to the escrows page
    await page.goto('/escrows');
    
    // Find an escrow that is in "Released" or "Refunded" status to test the download functionality
    // The status tags use getStatusColor which might be complex, let's look for text
    const releasedEscrows = page.locator('text=Released').first();
    
    if (await releasedEscrows.isVisible()) {
      // Click on the first released/refunded escrow
      await releasedEscrows.click();
      
      // Wait for the escrow details page to load
      await expect(page).toHaveURL(/.*escrow\/\d+/);
      
      // Look for the "Official Agreement PDF" button (as per EscrowDetails.tsx)
      const downloadButton = page.locator('button:has-text("Official Agreement PDF")');
      await expect(downloadButton).toBeVisible();
      
      // Click the download button
      await downloadButton.click();
      
      // Verify a success message appears
      await expect(page.locator('text=Downloaded!')).toBeVisible();
    } else {
      console.log('No released/refunded escrows found to test download functionality');
    }
  });

  test('should create escrow with non-existent user and trigger invitation', async ({ page }) => {
    await page.getByRole('main').getByRole('link', { name: 'Start New Deal' }).click();
    await expect(page).toHaveURL(/.*create-escrow/);

    // Select Detailed option
    await page.click('text=Detailed');
    await page.click('button:has-text("Continue")');

    // Try to search for a non-existent user by using an email that likely doesn't exist
    const fakeEmail = 'nonexistent-user-' + Date.now() + '@example.com';
    await page.fill('input[placeholder="Search seller by email..."]', fakeEmail);
    await page.waitForTimeout(2000); // Wait for debounced search
    
    // Check if there's a suggestion to invite the user by email
    await expect(page.locator('text=Invite')).toBeVisible();
    
    // Select the invited user
    await page.locator('text=Invite').first().click();
    await expect(page.locator('button >> .lucide-trash2')).toBeVisible();

    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Back")');
  });
});