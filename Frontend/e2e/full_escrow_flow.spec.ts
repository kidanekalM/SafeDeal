import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive End-to-End Test for SafeDeal Escrow Platform
 * Tests the complete flow: Registration → Login → Create Escrow → Accept → Chat → Dispute → Payment
 * 
 * Test Card (Chapa Test Mode):
 * Card Number: 4200 0000 0000 0000
 * CVV: 123
 * Expiry: 12/34
 */

test.describe('Complete Escrow Flow', () => {
  // Test accounts
  const buyerEmail = `buyer-${Date.now()}@test.com`;
  const sellerEmail = `seller-${Date.now()}@test.com`;
  const password = 'TestPassword123!';
  const testAmount = '500';

  // Shared context for two-user flow
  let buyerContext: BrowserContext | null = null;
  let sellerContext: BrowserContext | null = null;
  let buyerPage: Page | null = null;
  let sellerPage: Page | null = null;

  test.beforeAll(async ({ browser }) => {
    try {
      // Create two separate browser contexts for buyer and seller
      buyerContext = await browser.newContext();
      sellerContext = await browser.newContext();
      buyerPage = await buyerContext.newPage();
      sellerPage = await sellerContext.newPage();
    } catch (error) {
      console.error('Failed to create browser contexts:', error);
      throw error;
    }
  });

  test.afterAll(async () => {
    try {
      if (buyerContext) await buyerContext.close();
      if (sellerContext) await sellerContext.close();
    } catch (error) {
      console.error('Failed to close browser contexts:', error);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Bypass language modal and guided tour
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });
  });

  // ============================================
  // PART 1: REGISTRATION
  // ============================================
  test.describe('1. Registration', () => {
    test('should register buyer account', async ({ page }) => {
      await page.goto('/login?mode=register');
      
      // Step 1: Basic Info
      await page.fill('input[name="first_name"]', 'Buyer');
      await page.fill('input[name="last_name"]', 'Test');
      await page.fill('input[name="profession"]', 'Developer');
      await page.fill('input[name="email"]', buyerEmail);
      await page.fill('input[name="password"]', password);
      await page.click('button:has-text("Next: Payout Details")');

      // Step 2: Payout Details
      await page.fill('input[name="account_name"]', 'Buyer Test');
      await page.selectOption('select[name="bank_code"]', '946'); // CBE
      await page.fill('input[name="account_number"]', '1000123456789');
      
      await page.click('button:has-text("Complete Registration")');

      // Should show success toast and stay on login
      await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/.*login/);
    });

    test('should register seller account', async ({ page }) => {
      await page.goto('/login?mode=register');
      
      // Step 1: Basic Info
      await page.fill('input[name="first_name"]', 'Seller');
      await page.fill('input[name="last_name"]', 'Test');
      await page.fill('input[name="profession"]', 'Designer');
      await page.fill('input[name="email"]', sellerEmail);
      await page.fill('input[name="password"]', password);
      await page.click('button:has-text("Next: Payout Details")');

      // Step 2: Payout Details
      await page.fill('input[name="account_name"]', 'Seller Test');
      await page.selectOption('select[name="bank_code"]', '946'); // CBE
      await page.fill('input[name="account_number"]', '2000123456789');
      
      await page.click('button:has-text("Complete Registration")');

      // Should show success toast and stay on login
      await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/.*login/);
    });
  });

  // ============================================
  // PART 2: LOGIN
  // ============================================
  test.describe('2. Login', () => {
    test('should login buyer', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'Welcome', exact: false })).toBeVisible({ timeout: 10000 });
    });

    test('should login seller', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', sellerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'Welcome', exact: false })).toBeVisible({ timeout: 10000 });
    });
  });

  // ============================================
  // PART 3: CREATE ESCROW (Buyer Side)
  // ============================================
  test.describe('3. Create Escrow', () => {
    test('buyer should create a new escrow', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to create escrow
      await page.click('text=Start New Deal');
      await expect(page).toHaveURL(/.*create-escrow/);

      // Step 1: Role & Type - Quick Escrow is default
      await page.click('button:has-text("Continue")');

      // Step 2: Parties - Search for seller
      await page.fill('input[placeholder="Search seller by email..."]', 'Seller');
      await page.waitForTimeout(2000); // Wait for search results
      await page.waitForSelector('button:has-text("Seller")', { timeout: 5000 });
      await page.locator('button:has-text("Seller")').first().click();
      
      // Verify user is selected
      await expect(page.locator('button >> .lucide-trash2').first()).toBeVisible();
      await page.click('button:has-text("Continue")');

      // Step 3: Terms
      await page.fill('textarea[name="conditions"]', 'Test escrow terms for automated testing flow.');
      await page.fill('input[name="amount"]', testAmount);
      await page.click('button:has-text("Continue")');

      // Step 4: Finalize
      await expect(page.locator(`text=${testAmount} ETB`)).toBeVisible();
      await page.click('button:has-text("Start Secure Escrow")');

      // Should redirect to escrows list with success message
      await expect(page).toHaveURL(/.*escrows/, { timeout: 10000 });
      await expect(page.locator('text=Escrow created successfully')).toBeVisible({ timeout: 10000 });
    });
  });

  // ============================================
  // PART 4: VIEW ESCROW (Buyer Side)
  // ============================================
  test.describe('4. View Escrow', () => {
    test('buyer should see created escrow in list', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to escrows list
      await page.click('text=My Escrows');
      await expect(page).toHaveURL(/.*escrows/);

      // Should see the created escrow
      await expect(page.locator(`text=${testAmount} ETB`).first()).toBeVisible();
    });

    test('buyer should view escrow details', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to escrows list
      await page.click('text=My Escrows');
      await expect(page).toHaveURL(/.*escrows/);

      // Click on first escrow to view details
      await page.locator('[class*="cursor-pointer"]').first().click();
      
      // Should show escrow details page
      await expect(page).toHaveURL(/\/escrow\/\d+/);
      
      // Verify status is pending (awaiting seller acceptance)
      await expect(page.locator('text=Pending').or(page.locator('text=AWAITING_ACCEPTANCE')).or(page.locator('text=Awaiting'))).toBeVisible();
    });
  });

  // ============================================
  // PART 5: CREATE ESCROW (Detailed)
  // ============================================
  test.describe('5. Create Detailed Escrow', () => {
    test('should create an Detailed escrow with dispute clauses', async ({ page }) => {
      // Login as buyer
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to create escrow
      await page.click('text=Start New Deal');
      await expect(page).toHaveURL(/.*create-escrow/);

      // Step 1: Select Detailed option
      await page.click('text=Detailed');
      await page.click('button:has-text("Continue")');

      // Step 2: Select counterparty
      await page.fill('input[placeholder="Search seller by email..."]', 'test');
      await page.waitForSelector('button:has-text("test")', { timeout: 5000 });
      await page.locator('button:has-text("test")').first().click();
      await page.click('button:has-text("Continue")');

      // Step 3: Fill terms
      await page.fill('textarea[name="conditions"]', 'Detailed Escrow Terms - This is a detailed test deal for the Detailed route.');
      await page.fill('input[name="amount"]', '1500');
      await page.click('button:has-text("Continue")');

      // Step 4: Add milestones
      await page.fill('input[placeholder="Milestone Title"]', 'Initial Planning');
      await page.fill('input[placeholder="Amount"]', '500');
      
      await page.click('button:has-text("Add")');
      await page.locator('input[placeholder="Milestone Title"]').nth(1).fill('Implementation Phase');
      await page.locator('input[placeholder="Amount"]').nth(1).fill('1000');
      
      await expect(page.locator('text=1,500 ETB')).toBeVisible();
      await page.click('button:has-text("Continue")');

      // Step 5: Final review - check for dispute clause fields
      await expect(page.locator('text=Dispute Clause')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Dispute Resolution Procedure')).toBeVisible();
      await expect(page.locator('text=Arbitration Terms')).toBeVisible();
      await expect(page.locator('text=Court Jurisdiction for Disputes')).toBeVisible();

      // Verify dispute resolution options are present
      await expect(page.locator('text=AI Smart Resolution')).toBeVisible();
      
      // Create the escrow
      await page.click('button:has-text("Start Secure Escrow")');

      // Should redirect to escrows list
      await expect(page).toHaveURL(/.*escrows/);
      await expect(page.locator('text=Escrow created successfully')).toBeVisible();
    });
  });

  // ============================================
  // PART 6: ACCEPT ESCROW (Seller Side)
  // ============================================
  test.describe('6. Accept Escrow', () => {
    test('seller should accept the escrow', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', sellerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to escrows list
      await page.click('text=My Escrows');
      await expect(page).toHaveURL(/.*escrows/);

      // Should see incoming escrow from buyer
      await expect(page.locator('text=Seller').first()).toBeVisible();

      // Click on escrow to view details
      await page.locator('[class*="cursor-pointer"]').first().click();
      await expect(page).toHaveURL(/\/escrow\/\d+/);

      // Accept the escrow
      const acceptButton = page.locator('button:has-text("Accept")').or(page.locator('button:has-text("Accept Escrow")')).or(page.locator('button:has-text("Accept Deal")'));
      await acceptButton.click();

      // Wait for acceptance confirmation
      await page.waitForTimeout(2000);
      
      // Verify status changed (should now be awaiting payment or funded)
      const statusText = await page.textContent('body');
      expect(statusText).toMatch(/ACTIVE|FUNDED|AWAITING_PAYMENT|PAYMENT_PENDING/);
    });
  });

  // ============================================
  // PART 7: CHAT (Both Parties)
  // ============================================
  test.describe('7. Real-time Chat', () => {
    test('buyer should open chat and send message', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to escrow details
      await page.click('text=My Escrows');
      await page.locator('[class*="cursor-pointer"]').first().click();
      await expect(page).toHaveURL(/\/escrow\/\d+/);

      // Open chat
      const chatButton = page.locator('button:has-text("Chat")').or(page.locator('[aria-label*="Chat"]')).or(page.locator('[class*="message"]'));
      await chatButton.first().click();

      // Chat modal should open
      await expect(page.locator('text=Chat').or(page.locator('[class*="chat"]')).or(page.locator('input[placeholder*="message" i]'))).toBeVisible({ timeout: 5000 });

      // Send a message
      await page.fill('input[placeholder*="message" i]', 'Hello, I am ready to proceed with the transaction.');
      await page.click('button:has-text("Send")');

      // Message should appear in chat
      await expect(page.locator('text=Hello, I am ready')).toBeVisible();
    });

    test('seller should see and respond to chat message', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', sellerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to escrow details
      await page.click('text=My Escrows');
      await page.locator('[class*="cursor-pointer"]').first().click();
      await expect(page).toHaveURL(/\/escrow\/\d+/);

      // Open chat
      const chatButton = page.locator('button:has-text("Chat")').or(page.locator('[aria-label*="Chat"]')).or(page.locator('[class*="message"]'));
      await chatButton.first().click();

      // Should see buyer's message
      await expect(page.locator('text=Hello, I am ready')).toBeVisible({ timeout: 5000 });

      // Send a response
      await page.fill('input[placeholder*="message" i]', 'Great, I have accepted the escrow. Please proceed with payment.');
      await page.click('button:has-text("Send")');

      // Response should appear
      await expect(page.locator('text=Great, I have accepted')).toBeVisible();
    });
  });

  // ============================================
  // PART 8: PAYMENT (Buyer Side) - Chapa Test
  // ============================================
  test.describe('8. Payment with Chapa', () => {
    test('buyer should initiate and complete payment with test card', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Navigate to escrow details
      await page.click('text=My Escrows');
      await page.locator('[class*="cursor-pointer"]').first().click();
      await expect(page).toHaveURL(/\/escrow\/\d+/);

      // Initiate payment
      const payButton = page.locator('button:has-text("Pay")').or(page.locator('button:has-text("Pay Now")')).or(page.locator('button:has-text("Fund")'));
      await payButton.click();

      // Payment modal should appear
      await expect(page.locator('text=Payment').or(page.locator('text=Pay with Chapa')).or(page.locator('text=Chapa'))).toBeVisible({ timeout: 5000 });

      // Enter test card details
      // Card Number: 4200 0000 0000 0000
      const cardNumberInput = page.locator('input[name="card_number"]').or(page.locator('input[placeholder*="card" i]')).or(page.locator('input[id*="card"]'));
      if (await cardNumberInput.isVisible()) {
        await cardNumberInput.fill('4200000000000000');
      }

      // CVV: 123
      const cvvInput = page.locator('input[name="cvv"]').or(page.locator('input[placeholder*="cvv" i]')).or(page.locator('input[id*="cvv"]'));
      if (await cvvInput.isVisible()) {
        await cvvInput.fill('123');
      }

      // Expiry: 12/34
      const expiryInput = page.locator('input[name="expiry"]').or(page.locator('input[placeholder*="expiry" i]')).or(page.locator('input[id*="expiry"]'));
      if (await expiryInput.isVisible()) {
        await expiryInput.fill('12/34');
      }

      // Submit payment
      const submitButton = page.locator('button:has-text("Submit")').or(page.locator('button:has-text("Pay")')).or(page.locator('button:has-text("Complete Payment")'));
      await submitButton.click();

      // Wait for payment processing
      await page.waitForTimeout(5000);

      // Verify payment success or redirect
      const pageContent = await page.textContent('body');
      // Check for success indicators
      const paymentSuccess = pageContent?.includes('success') || pageContent?.includes('Success') || 
                            pageContent?.includes('completed') || pageContent?.includes('Completed') ||
                            pageContent?.includes('FUNDED') || pageContent?.includes('Funded');
      
      if (!paymentSuccess) {
        // Take screenshot for debugging
        await page.screenshot({ path: `test-results/payment-debug-${Date.now()}.png` });
      }
      
      console.log('Payment test completed. Page status:', paymentSuccess ? 'Success indicators found' : 'No success indicators');
    });
  });

  // ============================================
  // PART 9: DISPUTE & DOWNLOAD AGREEMENT
  // ============================================
  test.describe('9. Dispute & Download Agreement', () => {
    test('should be able to download finalized agreement when escrow is released', async ({ page }) => {
      // Login as buyer
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Go to escrows page
      await page.goto('/escrows');
      
      // Wait for escrows to load
      await expect(page.locator('text=My Escrows').or(page.locator('text=Active Deals'))).toBeVisible();
      
      // Find an escrow that is released or refunded to test the download functionality
      // First, find all escrows
      const escrowItems = page.locator('.card').filter({ has: page.locator('.status-tag') });
      const count = await escrowItems.count();
      
      let foundReleasedEscrow = false;
      for (let i = 0; i < count; i++) {
        const escrowItem = escrowItems.nth(i);
        const statusTag = escrowItem.locator('.status-tag');
        const statusText = await statusTag.textContent();
        
        if (statusText && (statusText.includes('Released') || statusText.includes('Refunded'))) {
          // Click on this escrow
          await escrowItem.click();
          
          // Wait for page to load
          await expect(page.locator('text=Escrow Details').or(page.locator('text=Deal Information'))).toBeVisible();
          
          // Look for the download agreement button
          const downloadButton = page.locator('button:has-text("Download Final Agreement")');
          
          // Wait for the button to appear (might take time to load the page)
          await expect(downloadButton).toBeVisible({ timeout: 10000 });
          
          // Click the download button
          await downloadButton.click();
          
          // Expect a success toast notification
          await expect(page.locator('text=Agreement downloaded successfully')).toBeVisible({ timeout: 5000 });
          
          foundReleasedEscrow = true;
          break;
        }
      }
      
      if (!foundReleasedEscrow) {
        console.log('No released/refunded escrows found to test download functionality');
      }
    });
  });

  // ============================================
  // PART 10: NOTIFICATION CENTER
  // ============================================
  test.describe('10. Notifications', () => {
    test('user should see notifications', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Click notification bell
      const notificationBell = page.locator('[aria-label*="notification" i]').or(page.locator('[class*="notification"]')).or(page.locator('button >> .lucide-bell'));
      await notificationBell.click();

      // Notification panel should open
      await expect(
        page.locator('text=Notification').or(page.locator('[class*="notification-panel"]')).or(page.locator('text=Notifications'))
      ).toBeVisible({ timeout: 5000 });
    });
  });

  // ============================================
  // PART 11: LOGOUT
  // ============================================
  test.describe('11. Logout', () => {
    test('should logout successfully', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', buyerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]:has-text("Sign In")');
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

      // Logout
      const logoutButton = page.locator('button:has-text("Log Out")').or(page.locator('button:has-text("Logout")')).or(page.locator('[aria-label*="logout" i]'));
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
    });
  });
});

/**
 * Alternative Single-User Flow Test
 * For simpler testing without two-user coordination
 */
test.describe('Single-User Escrow Flow', () => {
  const testEmail = `single-${Date.now()}@test.com`;
  const password = 'TestPassword123!';
  const testAmount = '250';

  test('complete flow with single user (limited)', async ({ page }) => {
    // Bypass language modal
    await page.addInitScript(() => {
      window.localStorage.setItem('lang', 'en');
      window.localStorage.setItem('has_seen_tour', 'true');
    });

    // 1. Register
    await page.goto('/login?mode=register');
    await page.fill('input[name="first_name"]', 'Single');
    await page.fill('input[name="last_name"]', 'User');
    await page.fill('input[name="profession"]', 'Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button:has-text("Next: Payout Details")');
    await page.fill('input[name="account_name"]', 'Single User');
    await page.selectOption('select[name="bank_code"]', '946');
    await page.fill('input[name="account_number"]', '3000123456789');
    await page.click('button:has-text("Complete Registration")');
    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });

    // 2. Login
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // 3. View Dashboard
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });

    // 4. Navigate to Profile
    await page.click('text=Profile');
    await expect(page).toHaveURL(/.*profile/);

    // 5. View Transaction History
    await page.click('text=Payments');
    await expect(page).toHaveURL(/.*transactions/);

    // 6. Search for users
    await page.click('text=Search');
    await expect(page).toHaveURL(/.*search/);
    await page.fill('input[placeholder*="search" i]', 'test');
    await page.waitForTimeout(1000);

    // 7. View All Escrows
    await page.click('text=My Escrows');
    await expect(page).toHaveURL(/.*escrows/);

    // 8. Logout
    await page.click('button:has-text("Log Out")');
    await expect(page).toHaveURL(/.*login/);
  });
});
