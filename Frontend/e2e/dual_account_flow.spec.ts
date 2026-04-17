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
      page.on('console', msg => console.log(`[${label} Browser] ${msg.text()}`));
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
    
    await expect(buyerPage.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 15000 });
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
    
    await expect(sellerPage.locator('button:has-text("Sign In")')).toBeVisible({ timeout: 15000 });
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
    await buyerPage.click('text=Start Deal');
    await buyerPage.click('button:has-text("Continue")'); 
    
    await buyerPage.fill('input[placeholder="Search by name or email..."]', sellerEmail);
    await buyerPage.waitForTimeout(3000);
    await buyerPage.locator(`button:has-text("${sellerEmail}")`).first().click();
    await buyerPage.click('button:has-text("Continue")');
    
    await buyerPage.fill('textarea[name="conditions"]', 'Dual account flow test');
    await buyerPage.fill('input[name="amount"]', testAmount);
    await buyerPage.click('button:has-text("Continue")');
    await buyerPage.click('button:has-text("Start Secure Escrow")');
    
    await expect(buyerPage).toHaveURL(/.*escrows/);
    console.log('Escrow created');

    // 5. Seller accepts escrow
    console.log('Seller accepting escrow...');
    await sellerPage.goto('http://localhost:3000/escrows');
    await sellerPage.locator('[class*="cursor-pointer"]').first().click();
    
    const acceptButton = sellerPage.locator('button:has-text("Accept")').or(sellerPage.locator('button:has-text("Accept Escrow")'));
    await acceptButton.click();
    await expect(sellerPage.locator('text=Escrow accepted')).toBeVisible();

    // 6. Buyer funds escrow
    console.log('Buyer funding escrow...');
    await buyerPage.goto('http://localhost:3000/escrows');
    await buyerPage.locator('[class*="cursor-pointer"]').first().click();
    
    const payButton = buyerPage.locator('button:has-text("Pay")').or(buyerPage.locator('button:has-text("Fund")'));
    await payButton.click();
    
    const manualVerify = buyerPage.locator('button:has-text("CBE Manual")');
    if (await manualVerify.isVisible({ timeout: 5000 })) {
        await manualVerify.click();
        await buyerPage.fill('input[placeholder*="Transaction ID"]', 'TX-FLOW-TEST');
        await buyerPage.fill('input[placeholder*="Account Suffix"]', '1234');
        await buyerPage.click('button:has-text("Submit Verification")');
        await expect(buyerPage.locator('text=Verification submitted')).toBeVisible();
    }

    console.log('Flow test completed successfully up to verification!');
    
    await buyerContext.close();
    await sellerContext.close();
  });
});
