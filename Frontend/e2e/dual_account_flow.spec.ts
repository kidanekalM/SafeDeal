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
    await buyerPage.click('text=Start New Deal');
    await expect(buyerPage).toHaveURL(/.*create-escrow/);
    
    await buyerPage.click('button:has-text("Continue")'); 
    
    await buyerPage.fill('input[placeholder="Search seller by email..."]', sellerEmail);
    await buyerPage.waitForTimeout(3000);
    // Use a more specific selector for the search result
    await buyerPage.locator(`button:has-text("${sellerEmail}")`).first().click();
    await buyerPage.click('button:has-text("Continue")');
    
    await buyerPage.fill('textarea[name="conditions"]', 'Dual account flow test');
    await buyerPage.fill('input[name="amount"]', testAmount);
    await buyerPage.click('button:has-text("Continue")');
    await buyerPage.click('button:has-text("Start Deal")');
    
    await expect(buyerPage).toHaveURL(/.*escrows/, { timeout: 15000 });
    console.log('Escrow created');

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
    await buyerPage.click('button:has-text("CBE Direct Verify")');
    
    // Fill details
    await buyerPage.fill('input[placeholder="FT..."]', 'FT26072JFV9');
    await buyerPage.fill('input[placeholder="262..."]', '262856058');
    
    // Submit
    await buyerPage.click('button:has-text("Verify & Fund")');

    // Assert Funding
    await expect(buyerPage.locator('text=Payment verified successfully')).toBeVisible({ timeout: 30000 });
    
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

    console.log('Flow test completed successfully up to acceptance!');
    
    await buyerContext.close();
    await sellerContext.close();
  });
});
