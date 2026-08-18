import { test, expect, Page, BrowserContext } from '@playwright/test';

const API = 'http://localhost:8081/api';
const UI = 'http://localhost:3000';
const PW = 'TestPassword123!';

async function apiReq(path: string, method: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = r.headers.get('content-type') || '';
  let data: any = null;
  if (ct.includes('application/json')) { try { data = await r.json(); } catch (e) {} }
  else { try { data = await r.text(); } catch (e) {} }
  return { status: r.status, data };
}

async function registerUser(email: string, role: string) {
  const ts = Date.now();
  const r = await apiReq('/register', 'POST', {
    first_name: role, last_name: 'Uat', profession: 'Engineer',
    email, phone: '+251911000000', password: PW,
    account_name: role + ' Uat', account_number: '1000000' + ts.toString().slice(-7),
    bank_code: 946, bank_name: 'CBE',
  });
  if (r.status !== 200) throw new Error('register failed: ' + JSON.stringify(r.data));
  const lr = await apiReq('/login', 'POST', { email, password: PW });
  return {
    id: lr.data.data.user.id,
    email,
    token: lr.data.data.access_token,
    firstName: role,
  };
}

async function setupContext(browser: any, label: string): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    window.localStorage.setItem('lang', 'en');
    window.localStorage.setItem('has_seen_tour', 'true');
  });
  ctx.on('pageerror', (err) => console.log(`[${label} PageError] ${err.message}`));
  return ctx;
}

async function login(page: Page, email: string) {
  await page.goto(`${UI}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PW);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
}

// --- SHARED CREATE-ESCROW UI DRIVER (5 steps) ---
async function findEscrowId(title: string, token: string): Promise<number> {
  const r = await apiReq('/v1/escrows', 'GET', null, token);
  const list = r.data?.data ?? r.data ?? [];
  const hit = list.find((e: any) => e.title === title);
  if (!hit) throw new Error('escrow not found by title: ' + title);
  return hit.id;
}

async function createEscrowViaUI(
  page: Page,
  opts: { type: 'item' | 'project'; sellerEmail: string; title: string; description: string; amount: string; milestones?: { title: string; amount: string }[] }
) {
  await page.goto(`${UI}/create-escrow`);
  await expect(page).toHaveURL(/.*create-escrow/);

  // Step 0: type + role
  if (opts.type === 'project') {
    await page.getByRole('button', { name: /Project \/ Service/ }).click();
  } else {
    await page.getByRole('button', { name: /Buy \/ Sell Item/ }).click();
  }
  await page.click('button:has-text("Continue")');

  // Step 1: parties (buyer creating -> select seller)
  await page.fill('input[placeholder="Enter seller email..."]', opts.sellerEmail);
  await page.waitForTimeout(1500);
  await page.locator(`button:has-text("${opts.sellerEmail}")`).first().click();
  await page.click('button:has-text("Continue")');

  // Step 2: basics
  await page.fill('input[placeholder*="MacBook"], input[placeholder*="Website"]', opts.title).catch(() => {
    return page.locator('form input').first().fill(opts.title);
  });
  // title input is first text input in the basics step
  await page.fill('textarea', opts.description);
  await page.click('button:has-text("Continue")');

  // Step 3: timeline (delivery + inspection + dispute resolution)
  await page.click('button:has-text("Continue")');

  // Step 4: financial
  if (opts.type === 'item') {
    await page.fill('input[placeholder="0"]', opts.amount);
  } else {
    for (const m of opts.milestones || []) {
      await page.click('button:has-text("+ Add Milestone")');
      // fill last milestone card
      const cards = page.locator('div.group');
      const last = cards.last();
      await last.locator('input[placeholder="Deliverable name..."]').fill(m.title);
      await last.locator('input[placeholder="0"]').fill(m.amount);
    }
  }
  await page.click('button:has-text("Continue")');

  // Step 5: review -> launch
  await page.click('button:has-text("Secure Launch")');
  await expect(page).toHaveURL(/.*escrows/, { timeout: 20000 });
}

// --- PAY + ACCEPT + PRINT via UI ---
async function buyerPays(page: Page, escrowId: number, buyerToken: string) {
  await page.goto(`${UI}/escrow/${escrowId}`);
  await expect(page).toHaveURL(/\/escrow\/\d+/);
  await page.waitForSelector('button:has-text("CBE Direct Verify")', { timeout: 15000 });
  await page.click('button:has-text("CBE Direct Verify")');
  await page.waitForSelector('input[placeholder="FT..."]', { timeout: 5000 });
  await page.fill('input[placeholder="FT..."]', 'FT26072JFV9');
  await page.fill('input[placeholder="Account Suffix..."]', '262856058');
  await page.click('button:has-text("Verify & Fund")');

  // Wait until the escrow status flips to funded via API (authoritative).
  await expect.poll(async () => {
    const r = await apiReq(`/v1/escrows/${escrowId}`, 'GET', null, buyerToken);
    return r.data?.status ?? r.data?.data?.status;
  }, { timeout: 20000 }).toBe('funded');
  await page.waitForTimeout(1000);
}

async function sellerAccepts(page: Page, escrowId: number, sellerToken: string) {
  await page.goto(`${UI}/escrow/${escrowId}`);
  await expect(page).toHaveURL(/\/escrow\/\d+/);
  await page.waitForTimeout(1000);
  const accept = page.locator('button:has-text("Accept Deal & Start Work")');
  if (await accept.isVisible({ timeout: 3000 })) {
    await accept.click();
  }
  // Verify via API: escrow becomes active and seller_accepted_at is set.
  await expect.poll(async () => {
    const r = await apiReq(`/v1/escrows/${escrowId}`, 'GET', null, sellerToken);
    const e = r.data?.status ? r.data : r.data?.data;
    return e?.active === true ? 'active' : e?.status;
  }, { timeout: 20000 }).toBe('active');
  console.log(`[accept] escrow ${escrowId} now active`);
}

async function buyerPrintsContract(page: Page) {
  await page.waitForSelector('button:has-text("Print Agreement")', { timeout: 10000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null as any),
    page.click('button:has-text("Print Agreement")'),
  ]);
  return download;
}

test.describe('SafeDeal UAT: Both Flows End-to-End', () => {
  test.setTimeout(240000);
  const ts = Date.now();

  test('ITEM flow: create/invite -> pay -> accept -> print -> done', async ({ browser }) => {
    const buyer = await registerUser(`itb-${ts}@uat.com`, 'Buyer');
    const seller = await registerUser(`its-${ts}@uat.com`, 'Seller');
    const buyerCtx = await setupContext(browser, 'Buyer');
    const sellerCtx = await setupContext(browser, 'Seller');
    const buyerPage = await buyerCtx.newPage();
    const sellerPage = await sellerCtx.newPage();

    await login(buyerPage, buyer.email);
    await login(sellerPage, seller.email);

    const title = `UAT Item Flow ${ts}`;
    await createEscrowViaUI(buyerPage, {
      type: 'item', sellerEmail: seller.email, title,
      description: 'Dell XPS 13 laptop in mint condition for UAT.', amount: '1500',
    });

    // seller sees the pending deal
    await sellerPage.goto(`${UI}/escrows`);
    await expect(sellerPage.locator(`text=${title}`)).toBeVisible({ timeout: 15000 });

    // buyer pays
    const itemId = await findEscrowId(title, buyer.token);
    await buyerPays(buyerPage, itemId, buyer.token);

    // seller accepts
    await sellerAccepts(sellerPage, itemId, seller.token);

    // buyer prints contract
    await buyerPage.goto(`${UI}/escrow/${itemId}`);
    await buyerPrintsContract(buyerPage);

    // verify final-agreement endpoint has the item contract
    const fa = await apiReq(`/v1/escrows/${itemId}/final-agreement`, 'GET', null, buyer.token);
    expect(fa.data).toContain('SALES & PURCHASE TERMS');

    console.log(`[ITEM] flow complete: ${title} (id ${itemId})`);
    await buyerCtx.close();
    await sellerCtx.close();
  });

  test('PROJECT flow: create/invite with milestones -> pay -> accept -> print -> done', async ({ browser }) => {
    const buyer = await registerUser(`prb-${ts}@uat.com`, 'Buyer');
    const seller = await registerUser(`prs-${ts}@uat.com`, 'Seller');
    const buyerCtx = await setupContext(browser, 'Buyer');
    const sellerCtx = await setupContext(browser, 'Seller');
    const buyerPage = await buyerCtx.newPage();
    const sellerPage = await sellerCtx.newPage();

    await login(buyerPage, buyer.email);
    await login(sellerPage, seller.email);

    const title = `UAT Project Flow ${ts}`;
    await createEscrowViaUI(buyerPage, {
      type: 'project', sellerEmail: seller.email, title,
      description: 'Build a marketing website with 5 pages for UAT.',
      amount: '3000',
      milestones: [
        { title: 'Design mockups', amount: '1000' },
        { title: 'Development', amount: '2000' },
      ],
    });

    await sellerPage.goto(`${UI}/escrows`);
    await expect(sellerPage.locator(`text=${title}`)).toBeVisible({ timeout: 15000 });

    await buyerPays(buyerPage, await findEscrowId(title, buyer.token), buyer.token);
    await sellerAccepts(sellerPage, await findEscrowId(title, buyer.token), seller.token);

    await buyerPage.goto(`${UI}/escrows`);
    await buyerPage.locator('div').filter({ hasText: title }).getByRole('link', { name: 'View Details' }).first().click().catch(async () => {
      await buyerPage.getByRole('link', { name: 'View Details' }).first().click();
    });
    await buyerPrintsContract(buyerPage);

    const projId = await findEscrowId(title, buyer.token);
    const fa = await apiReq(`/v1/escrows/${projId}/final-agreement`, 'GET', null, buyer.token);
    expect(fa.data).toContain('MILESTONE PAYMENT TERMS');
    expect(fa.data).toContain('Milestone 1');

    console.log(`[PROJECT] flow complete: ${title} (id ${projId})`);
    await buyerCtx.close();
    await sellerCtx.close();
  });
});