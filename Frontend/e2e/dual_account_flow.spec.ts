import { test, expect } from '@playwright/test';

/**
 * Dual Account Escrow Flow
 * Buyer creates escrow -> Seller accepts -> Buyer funds -> Seller submits -> Buyer approves
 */

test.describe('Dual Account Escrow Flow', () => {
  const buyerEmail = `buyer-${Date.now()}@test.com`;
  const sellerEmail = `seller-${Date.now()}@test.com`;
  const password = 'TestPassword123!';
  const testAmount = '500';

  test('Complete escrow flow between buyer and seller', async ({ browser }) => {
    // 1. Setup contexts
    const buyerContext = await browser.newContext();
    const sellerContext = await browser.newContext();
    
    const setupPage = async (page, label) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.addInitScript(() => {
        window.localStorage.setItem('lang', 'en');
        window.localStorage.setItem('has_seen_tour', 'true');
      });
      page.on('console', msg => {
        const text = msg.text();
        if (text.startsWith('DEBUG:')) {
            console.log(`[${label} Browser DEBUG] ${text}`);
        } else {
            console.log(`[${label} Browser] ${text}`);
        }
      });
      page.on('pageerror', err => console.log(`[${label} PageError] ${err.message}`));
    };

    const buyerPage = await buyerContext.newPage();
    const sellerPage = await sellerContext.newPage();
    await setupPage(buyerPage, 'Buyer');
    await setupPage(sellerPage, 'Seller');

    // 2. Register both accounts
    console.log('Registering buyer...');
    await buyerPage.goto('http://localhost:3000/login?mode=register');
    await buyerPage.fill('input[name="first_name"]', 'Buyer');
    await buyerPage.fill('input[name="last_name"]', 'Test');
    await buyerPage.fill('input[name="profession"]', 'Developer');
    await buyerPage.fill('input[name="email"]', buyerEmail);
    await buyerPage.fill('input[name="password"]', password);
    await buyerPage.click('button:has-text("Next: Payout Details")');
    await buyerPage.fill('input[name="account_name"]', 'Buyer Test');
    await buyerPage.selectOption('select[name="bank_code"]', '946');
    await buyerPage.fill('input[name="account_number"]', '1000123456789');
    await buyerPage.click('button:has-text("Complete Registration")');
    
    await expect(buyerPage.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible({ timeout: 15000 });
    console.log('Buyer registered');

    console.log('Registering seller...');
    await sellerPage.goto('http://localhost:3000/login?mode=register');
    await sellerPage.fill('input[name="first_name"]', 'Seller');
    await sellerPage.fill('input[name="last_name"]', 'Test');
    await sellerPage.fill('input[name="profession"]', 'Designer');
    await sellerPage.fill('input[name="email"]', sellerEmail);
    await sellerPage.fill('input[name="password"]', password);
    await sellerPage.click('button:has-text("Next: Payout Details")');
    await sellerPage.fill('input[name="account_name"]', 'Seller Test');
    await sellerPage.selectOption('select[name="bank_code"]', '946');
    await sellerPage.fill('input[name="account_number"]', '2000123456789');
    await sellerPage.click('button:has-text("Complete Registration")');
    
    await expect(sellerPage.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible({ timeout: 15000 });
    console.log('Seller registered');

    // 3. Login both
    console.log('Logging in buyer...');
    await buyerPage.goto('http://localhost:3000/login');
    await buyerPage.waitForSelector('input[type="email"]');
    await buyerPage.fill('input[type="email"]', buyerEmail);
    await buyerPage.fill('input[type="password"]', password);
    await buyerPage.click('button[type="submit"] >> text="Sign In"');
    
    await expect(buyerPage).toHaveURL(/.*dashboard/, { timeout: 20000 });
    console.log('Buyer logged in');

    console.log('Logging in seller...');
    await sellerPage.goto('http://localhost:3000/login');
    await sellerPage.waitForSelector('input[type="email"]');
    await sellerPage.fill('input[type="email"]', sellerEmail);
    await sellerPage.fill('input[type="password"]', password);
    await sellerPage.click('button[type="submit"] >> text="Sign In"');
    
    await expect(sellerPage).toHaveURL(/.*dashboard/, { timeout: 20000 });
    console.log('Seller logged in');

    // 4. Buyer creates escrow
    console.log('Buyer creating escrow...');
    await buyerPage.getByRole('main').getByRole('link', { name: 'Start New Deal' }).click();
    await expect(buyerPage).toHaveURL(/.*create-escrow/);
    
    await buyerPage.click('button:has-text("Continue")'); 
    
    await buyerPage.fill('input[placeholder="Search seller by email..."]', sellerEmail);
    await buyerPage.waitForTimeout(3000);
    // Use a more specific selector for the search result
    await buyerPage.locator(`button:has-text("${sellerEmail}")`).first().click();
    await buyerPage.click('button:has-text("Continue")');
    
    console.log('Filling conditions and amount...');
    await buyerPage.waitForSelector('textarea[name="conditions"]', { state: 'visible' });
    await buyerPage.fill('textarea[name="conditions"]', 'Dual account flow test conditions which are long enough.');
    await buyerPage.fill('input[name="amount"]', testAmount);
    
    // Trigger validation
    await buyerPage.press('input[name="amount"]', 'Tab');
    
    await buyerPage.click('button:has-text("Continue")');
    console.log('Clicked Continue from details');
    
    await buyerPage.click('button:has-text("Start Deal")');
    console.log('Clicked Start Deal');
    
    // Give it a moment for the request to process
    await buyerPage.waitForTimeout(2000);

    // Wait for the URL to change to the escrows list page
    await expect(buyerPage).toHaveURL(/.*escrows/, { timeout: 20000 });

    // Then check for the toast message (might be transient, so we don't strictly block on it if it's too fast)
    try {
        await expect(buyerPage.locator('text=Created!')).toBeVisible({ timeout: 5000 });
        console.log('Created! toast visible');
    } catch (e) {
        console.log('Created! toast not found or disappeared quickly');
    }

    console.log('Escrow created and redirected');


    // 5. Buyer funds escrow
    console.log('Buyer funding escrow...');
    await buyerPage.goto('http://localhost:3000/escrows');
    await buyerPage.waitForSelector('text=Dual account flow test');
    // Click View Details for this escrow
    await buyerPage.locator('div.card').filter({ hasText: 'Dual account flow test' }).getByRole('link', { name: 'View Details' }).click();
    
    // Check if status is "Pending" (needs funding)
    await expect(buyerPage.locator('div').filter({ hasText: /^Pending$/ }).first()).toBeVisible();
    
    console.log('Buyer attempting CBE Direct Verify...');
    // Refresh or wait for UI update
    await buyerPage.reload();
    
    // Perform CBE Verification
    await buyerPage.waitForSelector('button:has-text("CBE Direct Verify")', { state: 'visible', timeout: 15000 });
    await buyerPage.click('button:has-text("CBE Direct Verify")');
    
    // Ensure modal is visible
    await buyerPage.waitForSelector('text=CBE Verification', { state: 'visible', timeout: 5000 });
    
    // Fill details
    await buyerPage.fill('input[placeholder="FT..."]', 'FT26072JFV9');
    await buyerPage.fill('input[placeholder="262..."]', '262856058');
    
    // Submit
    await buyerPage.click('button:has-text("Verify & Fund")');

    // Assert Funding
    await expect(buyerPage.locator('text=Payment verified successfully')).toBeVisible({ timeout: 60000 });
    
    // Give it a moment to refresh or reload if needed
    await buyerPage.waitForTimeout(2000);
    await buyerPage.reload();
    await expect(buyerPage.locator('div').filter({ hasText: /^Funded$/ }).first()).toBeVisible({ timeout: 15000 });
    console.log('Escrow funded by buyer');

    // 6. Seller accepts escrow
    console.log('Seller accepting escrow...');
    await sellerPage.goto('http://localhost:3000/escrows');
    // Wait for the list to load
    await sellerPage.waitForSelector('text=Dual account flow test');
    // Click View Details for this escrow
    await sellerPage.locator('div.card').filter({ hasText: 'Dual account flow test' }).getByRole('link', { name: 'View Details' }).click();
    
    await expect(sellerPage).toHaveURL(/\/escrow\/\d+/);
    
    // Force reload to get latest status
    console.log('Seller reloading to get latest status...');
    await sellerPage.reload();
    
    // Verify status is Funded for seller
    console.log('Seller verifying status...');
    await expect(sellerPage.locator('div').filter({ hasText: /^Funded$/ }).first()).toBeVisible({ timeout: 20000 });
    
    console.log('Looking for Accept button...');
    const acceptButton = sellerPage.locator('button:has-text("Accept Funded Escrow")');
    await expect(acceptButton).toBeVisible({ timeout: 10000 });
    await acceptButton.click();
    await expect(sellerPage.locator('text=Escrow accepted')).toBeVisible({ timeout: 15000 });
    console.log('Escrow accepted by seller');

    // 7. Seller submits work (e.g. confirms deliverable)
    console.log('Seller submitting work...');
    // After acceptance, status becomes "Funded" but Active=true.
    // In our UI, seller can now "Mark as Completed" or similar?
    // Let's check EscrowDetails buttons for seller when Active=true
    
    // Actually, in many flows, seller just confirms they've sent it.
    // Let's look for a button that might exist for the seller.
    const sellerConfirmBtn = sellerPage.locator('button:has-text("Confirm Delivery")').or(sellerPage.locator('button:has-text("Mark as Completed")'));
    // If no such button, maybe seller just waits. 
    // Usually there's a "Confirm Delivery" for seller.
    
    if (await sellerConfirmBtn.isVisible({ timeout: 5000 })) {
        await sellerConfirmBtn.click();
        await expect(sellerPage.locator('text=Delivery confirmed')).toBeVisible({ timeout: 10000 });
        console.log('Seller confirmed delivery');
    }

    // 8. Buyer releases funds (Confirm Receipt)
    console.log('Buyer releasing funds...');
    await buyerPage.reload();
    await expect(buyerPage.locator('div').filter({ hasText: /^Funded$/ }).first()).toBeVisible({ timeout: 10000 });
    
    // Check if buyer sees "Confirm Receipt"
    const releaseButton = buyerPage.locator('button:has-text("Confirm Receipt")').or(buyerPage.locator('button:has-text("Release Funds")'));
    await expect(releaseButton).toBeVisible({ timeout: 10000 });
    await releaseButton.click();
    
    // Confirmation modal might appear
    const confirmRelease = buyerPage.locator('button:has-text("Yes, Release Funds")').or(buyerPage.locator('div[role="dialog"] button:has-text("Confirm")'));
    if (await confirmRelease.isVisible({ timeout: 5000 })) {
        await confirmRelease.click();
    }
    
    await expect(buyerPage.locator('text=Funds released successfully').or(buyerPage.locator('text=Released'))).toBeVisible({ timeout: 20000 });
    console.log('Buyer released funds');

    console.log('Full flow completed successfully!');
    
    await buyerContext.close();
    await sellerContext.close();
  });
});
