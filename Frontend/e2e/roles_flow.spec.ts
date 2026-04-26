import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Role-Based End-to-End Tests for SafeDeal
 * Scenarios:
 * 1. Simple Seller (Quick Escrow)
 * 2. Simple Buyer (Quick Escrow)
 * 3. Detailed Seller (Milestones + Lock)
 * 4. Detailed Buyer (Milestones + Lock)
 */

test.describe('Role-Based Escrow Flows', () => {
  test.setTimeout(120000); // 2 minutes for complex multi-page flows

  const password = 'TestPassword123!';
  const testAmount = '1000';

  let buyerContext: BrowserContext;
  let sellerContext: BrowserContext;
  let buyerPage: Page;
  let sellerPage: Page;

  const buyerEmail = `buyer-${Date.now()}@test.com`;
  const sellerEmail = `seller-${Date.now()}@test.com`;

  test.beforeAll(async ({ browser }) => {
    test.slow(); // Triple the timeout for this hook
    buyerContext = await browser.newContext();
    sellerContext = await browser.newContext();

    // Apply init script to contexts
    const initScript = () => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    };
    await buyerContext.addInitScript(initScript);
    await sellerContext.addInitScript(initScript);

    buyerPage = await buyerContext.newPage();
    sellerPage = await sellerContext.newPage();

    // Register both users
    for (const [page, email, name] of [[buyerPage, buyerEmail, 'Buyer'], [sellerPage, sellerEmail, 'Seller']] as const) {
      await page.goto('/login?mode=register');
      await page.fill('input[name="first_name"]', name);
      await page.fill('input[name="last_name"]', 'Test');
      await page.fill('input[name="profession"]', 'Tester');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      
      // Handle the "Next" button specifically to avoid interceptors
      const nextBtn = page.locator('button:has-text("Next")');
      await nextBtn.waitFor({ state: 'visible' });
      await nextBtn.click({ force: true });

      await page.fill('input[name="account_name"]', `${name} Test`);
      await page.selectOption('select[name="bank_code"]', '946');
      await page.fill('input[name="account_number"]', '1000' + Math.floor(Math.random() * 1000000000));
      
      const completeBtn = page.locator('button:has-text("Complete")');
      await completeBtn.waitFor({ state: 'visible' });
      await completeBtn.click({ force: true });

      // Check for success or error toast
      const toast = page.locator('text=Account created successfully, text=User with this email already exists, text=Error');
      await expect(toast).toBeVisible({ timeout: 15000 });
      console.log(`Registration result for ${email}: ${await toast.innerText()}`);

      await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
    }
  });

  test.beforeEach(async () => {
    for (const page of [buyerPage, sellerPage]) {
      await page.addInitScript(() => {
        window.localStorage.setItem('lang', 'en');
        window.localStorage.setItem('has_seen_tour', 'true');
      });
    }
  });

  async function login(page: Page, email: string) {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Log any error toast if it appears
    const errorToast = page.locator('.hot-toast-message, text=Invalid, text=failed, text=Error');
    if (await errorToast.isVisible({ timeout: 2000 })) {
       console.log(`Login Error for ${email}: ${await errorToast.innerText()}`);
    }

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  }

  test('Simple Buyer Flow (Quick Escrow)', async () => {
    await login(buyerPage, buyerEmail);
    await login(sellerPage, sellerEmail);

    // 1. Buyer Creates Quick Escrow
    await buyerPage.goto('/create-escrow');
    await buyerPage.click('button:has-text("Continue")'); // Role: Buyer, Mode: Quick (default)
    
    await buyerPage.fill('input[placeholder*="Search"]', sellerEmail);
    await buyerPage.waitForTimeout(1000);
    await buyerPage.click(`button:has-text("Seller")`);
    await buyerPage.click('button:has-text("Continue")');

    await buyerPage.fill('textarea[name="conditions"]', 'Simple Quick Escrow terms');
    await buyerPage.fill('input[name="amount"]', '500');
    await buyerPage.click('button:has-text("Continue")');
    await buyerPage.click('button:has-text("Start Deal")');

    await expect(buyerPage).toHaveURL(/.*escrows/);
    const escrowId = await buyerPage.locator('td:has-text("500")').first().getAttribute('data-escrow-id') || 'last';

    // 2. Seller Accepts
    await sellerPage.goto('/escrows');
    await sellerPage.click('text=View');
    await sellerPage.click('button:has-text("Accept")');
    await expect(sellerPage.locator('text=Funded')).toBeVisible();

    // 3. Buyer Confirms (Simulating funded state)
    await buyerPage.reload();
    await buyerPage.click('text=View');
    await buyerPage.click('button:has-text("Confirm & Release")');
    await expect(buyerPage.locator('text=Released')).toBeVisible();
  });

  test('Detailed Seller Flow (Milestones + Lock)', async () => {
    await login(sellerPage, sellerEmail);
    await login(buyerPage, buyerEmail);

    // 1. Seller Creates Detailed Escrow
    await sellerPage.goto('/create-escrow');
    await sellerPage.click('label:has-text("Seller")');
    await sellerPage.click('label:has-text("Detailed")');
    await sellerPage.click('button:has-text("Continue")');

    await sellerPage.fill('input[placeholder*="Search"]', buyerEmail);
    await sellerPage.waitForTimeout(1000);
    await sellerPage.click(`button:has-text("Buyer")`);
    await sellerPage.click('button:has-text("Continue")');

    await sellerPage.fill('textarea[name="conditions"]', 'Detailed Terms with Milestones');
    await sellerPage.fill('input[name="amount"]', '2000');
    await sellerPage.click('button:has-text("Continue")');

    // Milestones
    await sellerPage.click('button:has-text("Add Milestone")');
    await sellerPage.fill('input[placeholder="Milestone Title"]', 'Design Phase');
    await sellerPage.fill('input[name="milestone_amount"]', '1000');
    await sellerPage.click('button:has-text("Add Milestone")');
    await sellerPage.locator('input[placeholder="Milestone Title"]').nth(1).fill('Development Phase');
    await sellerPage.locator('input[name="milestone_amount"]').nth(1).fill('1000');
    await sellerPage.click('button:has-text("Continue")');
    await sellerPage.click('button:has-text("Start Deal")');

    await expect(sellerPage).toHaveURL(/.*escrows/);

    // 2. Buyer Accepts & Locks
    await buyerPage.goto('/escrows');
    await buyerPage.click('text=View');
    await buyerPage.click('button:has-text("Lock")');
    await expect(buyerPage.locator('text=Legal-Grade')).toBeVisible();
    await expect(buyerPage.locator('text=SHA-256')).toBeVisible();

    // 3. Seller also locks/signs
    await sellerPage.reload();
    await sellerPage.click('text=View');
    await sellerPage.click('button:has-text("Lock")');
    await expect(sellerPage.locator('text=Buyer Signed')).toBeVisible();
    await expect(sellerPage.locator('text=Seller Signed')).toBeVisible();
  });
});
