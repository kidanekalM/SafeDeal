import { test, expect } from '@playwright/test';

test.describe('Production parity escrow flow', () => {
  test.beforeEach(async ({ page }) => {
    let currentStatus: 'Disputed' | 'Released' = 'Disputed';
    await page.addInitScript(() => {
      const userProfile = {
        id: 1,
        first_name: 'Buyer',
        last_name: 'Tester',
        email: 'buyer@test.local',
        activated: true,
        profession: 'QA',
        account_name: 'Buyer Tester',
        account_number: '1000123456789',
        bank_code: 946,
        trust_score: 70,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('lang', 'en');
      localStorage.setItem('has_seen_tour', 'true');
      localStorage.setItem('user_profile', JSON.stringify(userProfile));
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: userProfile,
          isAuthenticated: true,
        },
        version: 0
      }));
    });

    await page.route('**/api/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          first_name: 'Buyer',
          last_name: 'Tester',
          email: 'buyer@test.local',
          profession: 'QA',
          activated: true,
          trust_score: 70,
          account_name: 'Buyer Tester',
          account_number: '1000123456789',
          bank_code: 946,
        }),
      });
    });

    await page.route('**/api/escrows/1', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          buyer_id: 1,
          seller_id: 2,
          amount: 500,
          platform_fee: 10,
          status: currentStatus,
          active: true,
          conditions: 'Deliver website in 3 days',
          jurisdiction: 'Ethiopia',
          governing_law: 'Ethiopian contract law',
          dispute_resolution: 'Arbitration',
          blockchain_tx_hash: '0xtesthash',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          milestones: [],
        }),
      });
    });

    await page.route('**/api/escrows/1/milestones', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/escrows/1/status-history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, from_status: '', to_status: 'Pending', reason: 'Escrow created' },
          { id: 2, from_status: 'Pending', to_status: 'Disputed', reason: 'Dispute created' },
        ]),
      });
    });

    await page.route('**/api/escrows/dispute/1/resolve', async (route) => {
      currentStatus = 'Released';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Dispute resolved',
          data: { id: 1, status: 'Released', dispute_status: 'Resolved' },
        }),
      });
    });

    await page.route('**/api/escrows/1/final-agreement', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'SAFEDEAL FORMAL ESCROW AGREEMENT',
      });
    });
  });

  test('renders status timeline and supports dispute resolution + final agreement export', async ({ page }) => {
    await page.goto('/escrow/1');

    await expect(page.getByText('Status Timeline (Audit)')).toBeVisible();
    await expect(page.getByText('Start -> Pending')).toBeVisible();
    await expect(page.getByText('Dispute Resolution')).toBeVisible();

    await page.getByPlaceholder('Resolution note').fill('Resolved by admin after evidence review');
    await page.getByRole('button', { name: 'Resolve: Release' }).click();

    await expect(page.getByText('Dispute resolved')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Finalized Agreement' })).toBeVisible();
    await page.getByRole('button', { name: 'Download Finalized Agreement' }).click();
    await expect(page.getByText('Formal Agreement')).toBeVisible();
  });
});
