import { test, expect } from '@playwright/test';

/**
 * End-to-End Test for CBE Direct Verification Flow
 * 
 * Test Data (Real CBE Receipt Scraped during test):
 * Transaction ID: FT26072JFV9
 * Account Suffix: 262856058
 * URL: https://apps.cbe.com.et:100/?id=FT26072JFV9262856058
 * Amount: 100.00 ETB
 */

test.describe('CBE Direct Verification Flow', () => {
  const timestamp = Date.now();
  const buyerEmail = `cbe-buyer-${timestamp}@test.com`;
  const sellerEmail = `cbe-seller-${timestamp}@test.com`;
  const password = 'TestPassword123!';
  const testAmount = '100'; // Must be 100 to match the receipt amount

  test.beforeEach(async ({ page }) => {
    // Bypass language modal and guided tour
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });
  });

  test('should verify escrow using CBE transaction ID', async ({ page }) => {
    // 1. Register Seller
    await page.goto('/login');
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[name="first_name"]', 'CBE');
    await page.fill('input[name="last_name"]', 'Seller');
    await page.fill('input[name="profession"]', 'Merchant');
    await page.fill('input[name="email"]', sellerEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button:has-text("Next: Payout Details")');
    await page.fill('input[name="account_name"]', 'CBE Seller');
    await page.selectOption('select[name="bank_code"]', '946');
    await page.fill('input[name="account_number"]', '1000262856058');
    await page.click('button:has-text("Complete Registration")');
    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 15000 });

    // 2. Register Buyer
    await page.goto('/login');
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[name="first_name"]', 'CBE');
    await page.fill('input[name="last_name"]', 'Buyer');
    await page.fill('input[name="profession"]', 'Customer');
    await page.fill('input[name="email"]', buyerEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button:has-text("Next: Payout Details")');
    await page.fill('input[name="account_name"]', 'CBE Buyer');
    await page.selectOption('select[name="bank_code"]', '946');
    await page.fill('input[name="account_number"]', '1000987654321');
    await page.click('button:has-text("Complete Registration")');
    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 15000 });

    // 3. Login Buyer
    await page.fill('input[type="email"]', buyerEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Login")');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // 4. Create Escrow
    await page.click('text=Start New Deal');
    await page.click('button:has-text("Continue")');
    
    // Search for seller
    await page.fill('input[placeholder="Search by name or email..."]', sellerEmail);
    await page.waitForTimeout(2000);
    await page.click(`button:has-text("Seller")`); // Should match "CBE Seller"
    await page.click('button:has-text("Continue")');

    // Terms - Amount must match verified receipt (100 ETB)
    await page.fill('textarea[name="conditions"]', 'CBE Verification Flow Test - Scraped Receipt');
    await page.fill('input[name="amount"]', testAmount);
    await page.click('button:has-text("Continue")');

    // Finalize
    await page.click('button:has-text("Start Secure Escrow")');
    await expect(page).toHaveURL(/.*escrows/, { timeout: 10000 });

    // 5. Navigate to Escrow Details
    await page.locator('[class*="cursor-pointer"]').first().click();
    await expect(page).toHaveURL(/\/escrow\/\d+/);

    // 6. Use CBE Direct Verify
    await page.click('button:has-text("CBE Direct Verify")');
    
    // Fill in Transaction ID and Suffix
    await page.fill('input[placeholder="FT..."]', 'FT26072JFV9');
    await page.fill('input[placeholder="262..."]', '262856058');
    
    // Submit for scraping and verification
    await page.click('button:has-text("Verify & Fund")');

    // 7. Validation
    // The backend should now:
    // a) Fetch https://apps.cbe.com.et:100/?id=FT26072JFV9262856058
    // b) Parse the PDF
    // c) Confirm Reference is FT26072JFV9
    // d) Confirm Amount is 100.00
    // e) Update status to Funded
    
    await expect(page.locator('text=Payment verified successfully')).toBeVisible({ timeout: 30000 });
    
    // Verify UI reflects "Funded" status
    await expect(page.locator('text=Funded')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Funds Secured')).toBeVisible();
    
    // Optional: Check if "CBE Direct Verify" button is gone
    await expect(page.locator('button:has-text("CBE Direct Verify")')).not.toBeVisible();
  });
});
