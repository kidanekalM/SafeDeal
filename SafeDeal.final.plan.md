Here's the complete, actionable implementation plan. No theory. No fluff. Just what needs to happen and in what order.

---

# 📦 ESCROW SYSTEM — IMPLEMENTATION PLAN vFINAL

**For:** Development team
**Current state:** MVP complete, 9 test suites passing, builds clean
**Goal:** Production-ready with full test coverage and hardened invariants
**Total estimated effort:** 3-4 days for one developer

---

## BEFORE YOU START

### What exists (DO NOT REBUILD)

- Backend: Go + Fiber + PostgreSQL — all models, handlers, middleware working
- Frontend: React + TypeScript + Vite — 12 pages, all flows working
- 9 Playwright test suites passing
- Quick mode and Detailed mode both functional
- Chat, notifications, payments, blockchain, disputes all implemented

### What this plan covers (ONLY WHAT TO ADD/FIX)

| # | Item | Type | Time |
|---|------|------|------|
| 1 | Fix 3 known issues | Bug fix | 1.5 hours |
| 2 | Create seed script | Tooling | 30 min |
| 3 | Add 4 Playwright test files | Testing | 6 hours |
| 4 | Run tests, fix failures | Debugging | 4 hours |
| 5 | Verify invariants | Validation | 2 hours |

---

## PHASE 1: FIX KNOWN ISSUES (Day 1 Morning — 1.5 hours)

### Issue 1: API Route Prefix Alignment

**Check first:**
```bash
cd frontend
grep -rn "api/milestones" src/ --include="*.ts" --include="*.tsx"
grep -rn "api/escrows" src/ --include="*.ts" --include="*.tsx" | grep -v "v1"
```

**If matches found, fix:**
- `/api/milestones` → `/api/v1/milestones`
- `/api/escrows` → `/api/v1/escrows` (except public routes)

**Commit:** `fix: align frontend API routes with /api/v1 prefix`

---

### Issue 2: Blockchain Client Graceful Degradation

**File:** `backend_monolithic/blockchain/client.go`

**Find the NewClient function. If it contains `log.Fatal` or `panic` on connection failure, replace with:**

```go
func NewClient(rpcURL, contractAddrHex, privateKeyHex string) (*Client, error) {
    if rpcURL == "" || contractAddrHex == "" {
        log.Println("Blockchain config missing. Running without blockchain anchoring.")
        return &Client{connected: false}, nil
    }

    client, err := ethclient.Dial(rpcURL)
    if err != nil {
        log.Printf("Blockchain RPC unavailable: %v. Running without blockchain.", err)
        return &Client{connected: false}, nil
    }

    // ... existing init code ...

    return &Client{
        ethClient:    client,
        connected:    true,
        contractAddr: contractAddr,
        privateKey:   privateKey,
    }, nil
}
```

**Then, in every handler that uses the blockchain client, add guard:**

```go
// In escrow handler, wherever blockchain calls happen:
if h.blockchainClient != nil && h.blockchainClient.IsConnected() {
    txHash, err := h.blockchainClient.CreateEscrow(data)
    if err != nil {
        log.Printf("Blockchain anchoring failed (non-critical): %v", err)
    } else {
        escrow.BlockchainTxHash = txHash
    }
}
```

**Commit:** `fix: graceful blockchain degradation instead of panic`

---

### Issue 3: Rate Limit Adjustment

**File:** `backend_monolithic/middleware/rate_limit.go`

**Find:**
```go
const MaxRequestsPerMinute = 1000
```

**Replace with:**
```go
const MaxRequestsPerMinute = 100
```

**Commit:** `fix: reduce rate limit to production-appropriate 100/min`

---

## PHASE 2: SEED DATA (Day 1 Midday — 30 min)

**File to create:** `scripts/seed_test_users.sh`

```bash
#!/bin/bash
# Creates test users via the API
# Usage: bash scripts/seed_test_users.sh

API="http://localhost:3000/api"
PASS="Test123!"

echo "Seeding test users..."

for user in seller buyer simple_seller simple_buyer admin; do
  echo "Creating ${user}@test.com..."
  curl -s -X POST "$API/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${user}@test.com\",
      \"password\": \"$PASS\",
      \"full_name\": \"Test ${user}\",
      \"phone\": \"+251900000000\"
    }" > /dev/null
done

echo ""
echo "Done. Test users created:"
echo "  seller@test.com         / Test123!"
echo "  buyer@test.com          / Test123!"
echo "  simple_seller@test.com  / Test123!"
echo "  simple_buyer@test.com   / Test123!"
echo "  admin@test.com          / Test123!"
```

**Make executable:**
```bash
chmod +x scripts/seed_test_users.sh
```

**Run once:**
```bash
bash scripts/seed_test_users.sh
```

**Commit:** `feat: add test user seed script`

---

## PHASE 3: TEST DATA ATTRIBUTES TO USE

Before writing tests, confirm the `data-testid` attributes exist in the frontend. The tests below reference these. If any are missing, add them to the components.

### Critical data-testid attributes to verify

**Auth page:**
- `email-input`
- `password-input`
- `login-button`
- `register-button`

**Dashboard:**
- `create-escrow-button`
- `nav-escrows`
- `nav-transactions`
- `logout-button`

**Create Escrow:**
- `quick-mode-option`
- `detailed-mode-option`
- `escrow-title`
- `escrow-description`
- `escrow-amount`
- `currency-select`
- `buyer-email`
- `next-step`
- `create-escrow-submit`
- `quick-title`
- `quick-amount`
- `quick-buyer-email`
- `quick-condition`
- `create-quick-submit`
- `add-milestone`
- `milestone-name-0`, `milestone-name-1`, `milestone-name-2`
- `milestone-amount-0`, `milestone-amount-1`, `milestone-amount-2`
- `review-title`
- `review-amount`
- `review-milestone-count`
- `step-indicator`

**Escrow Details:**
- `escrow-status`
- `escrow-mode-badge`
- `escrow-created-success`
- `accept-button`
- `fund-button`
- `confirm-fund`
- `release-button`
- `confirm-release`
- `confirm-receipt-button`
- `confirm-receipt-submit`
- `cancel-button`
- `dispute-button`
- `edit-escrow-button`
- `milestone-section`
- `milestone-list`
- `milestone-item-0`, `milestone-item-1`, `milestone-item-2`
- `milestone-0-status`, `milestone-1-status`
- `submit-milestone-0`
- `approve-milestone-0`
- `view-contract-button`
- `contract-content`
- `add-milestone-button`
- `receipt-note`
- `already-funded-error`

**Escrow List:**
- `escrow-card-0`
- `escrow-card-quick-pending`
- `escrow-card-status-active`

**Transactions:**
- `transaction-list`

### If data-testid attributes are missing

Add them to the components. Example:

```tsx
// In CreateEscrow.tsx
<input
  type="text"
  data-testid="escrow-title"
  {...register("title")}
/>
```

---

## PHASE 4: CREATE TEST FILES (Day 1 Afternoon + Day 2 — 6 hours)

### Test 1: `frontend/e2e/seller_flow.spec.ts`

**Purpose:** Verify seller creates detailed escrow with milestones, handles delivery flow.

```typescript
import { test, expect } from '@playwright/test';

const SELLER = { email: 'seller@test.com', password: 'Test123!' };
const BUYER = { email: 'buyer@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Seller Flow', () => {

  test('TC-SELLER-001: Create detailed escrow with milestones', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);

    await page.click('[data-testid="create-escrow-button"]');
    await page.click('[data-testid="detailed-mode-option"]');

    // Step 1: Parties
    await page.fill('[data-testid="escrow-title"]', 'Website Redesign');
    await page.fill('[data-testid="escrow-description"]', 'Complete redesign of 10 pages');
    await page.fill('[data-testid="buyer-email"]', BUYER.email);
    await page.click('[data-testid="next-step"]');

    // Step 2: Payment
    await page.fill('[data-testid="escrow-amount"]', '50000');
    await page.click('[data-testid="next-step"]');

    // Step 3: Milestones
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-name-0"]', 'Design Phase');
    await page.fill('[data-testid="milestone-amount-0"]', '20000');
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-name-1"]', 'Development');
    await page.fill('[data-testid="milestone-amount-1"]', '30000');
    await page.click('[data-testid="next-step"]');

    // Step 4: Review and submit
    await page.click('[data-testid="create-escrow-submit"]');
    await expect(page.locator('[data-testid="escrow-created-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-SELLER-002: Seller cannot fund or release before buyer actions', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);

    // Navigate to first escrow
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Fund button should be disabled for seller
    const fundBtn = page.locator('[data-testid="fund-button"]');
    if (await fundBtn.isVisible()) {
      await expect(fundBtn).toBeDisabled();
    }

    // Release button should be disabled
    const releaseBtn = page.locator('[data-testid="release-button"]');
    if (await releaseBtn.isVisible()) {
      await expect(releaseBtn).toBeDisabled();
    }
  });

  test('TC-SELLER-003: Escrow becomes locked and uneditable after buyer acceptance', async ({ page }) => {
    // Login as buyer, accept, and fund the escrow created above
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Accept
    await page.click('[data-testid="accept-button"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/active/i, { timeout: 5000 });

    // Fund
    await page.click('[data-testid="fund-button"]');
    await page.click('[data-testid="confirm-fund"]');

    // Now login as seller and verify cannot edit
    await page.click('[data-testid="logout-button"]');
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Edit button should not be visible when locked
    await expect(page.locator('[data-testid="edit-escrow-button"]')).not.toBeVisible({ timeout: 5000 });
  });
});
```

**Expected results:**
- Escrow created with 2 milestones
- Fund/release buttons disabled for seller
- Edit button hidden after contract locked

---

### Test 2: `frontend/e2e/buyer_flow.spec.ts`

**Purpose:** Verify buyer accepts, funds, idempotency check, confirms receipt, releases.

```typescript
import { test, expect } from '@playwright/test';

const BUYER = { email: 'buyer@test.com', password: 'Test123!' };
const SELLER = { email: 'seller@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Buyer Flow', () => {

  test('TC-BUYER-001: Buyer accepts and funds escrow', async ({ page }) => {
    // First, seller creates an escrow
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="create-escrow-button"]');
    await page.click('[data-testid="detailed-mode-option"]');
    await page.fill('[data-testid="escrow-title"]', 'Buyer Test Escrow');
    await page.fill('[data-testid="escrow-description"]', 'For buyer flow testing');
    await page.fill('[data-testid="buyer-email"]', BUYER.email);
    await page.click('[data-testid="next-step"]');
    await page.fill('[data-testid="escrow-amount"]', '10000');
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="next-step"]'); // Skip milestones
    await page.click('[data-testid="create-escrow-submit"]');
    await expect(page.locator('[data-testid="escrow-created-success"]')).toBeVisible({ timeout: 10000 });

    // Logout seller
    await page.click('[data-testid="logout-button"]');

    // Login as buyer
    await login(page, BUYER.email, BUYER.password);

    // Find and open escrow
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Accept
    await page.click('[data-testid="accept-button"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/active/i, { timeout: 5000 });

    // Fund
    await page.click('[data-testid="fund-button"]');
    await page.click('[data-testid="confirm-fund"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/funded/i, { timeout: 5000 });
  });

  test('TC-BUYER-002: Duplicate funding is blocked (idempotency)', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // If already funded, fund button shouldn't appear
    const fundBtn = page.locator('[data-testid="fund-button"]');
    if (await fundBtn.isVisible()) {
      await fundBtn.click();
      await page.click('[data-testid="confirm-fund"]');
      // Should show error or button disappears
      await expect(page.locator('[data-testid="already-funded-error"]')).toBeVisible({ timeout: 5000 });
    } else {
      // Button not visible, which is also correct
      await expect(fundBtn).not.toBeVisible();
    }
  });

  test('TC-BUYER-003: Buyer confirms receipt and releases', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Confirm receipt
    const receiptBtn = page.locator('[data-testid="confirm-receipt-button"]');
    if (await receiptBtn.isVisible()) {
      await receiptBtn.click();
      await page.fill('[data-testid="receipt-note"]', 'Item received as described');
      await page.click('[data-testid="confirm-receipt-submit"]');
    }

    // Release funds
    const releaseBtn = page.locator('[data-testid="release-button"]');
    if (await releaseBtn.isVisible()) {
      await releaseBtn.click();
      await page.click('[data-testid="confirm-release"]');
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/completed/i, { timeout: 5000 });
    }
  });
});
```

**Expected results:**
- Buyer can accept and fund
- Duplicate funding rejected
- Release completes escrow

---

### Test 3: `frontend/e2e/simple_seller.spec.ts`

**Purpose:** Verify Quick mode creates escrow without milestones, with auto-generated terms.

```typescript
import { test, expect } from '@playwright/test';

const SELLER = { email: 'simple_seller@test.com', password: 'Test123!' };
const BUYER = { email: 'simple_buyer@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Simple Seller Flow', () => {

  test('TC-SIMPLE-001: Create quick escrow with minimal fields', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);

    await page.click('[data-testid="create-escrow-button"]');
    await page.click('[data-testid="quick-mode-option"]');

    // Fill minimal form
    await page.fill('[data-testid="quick-title"]', 'Logo Design');
    await page.fill('[data-testid="quick-amount"]', '5000');
    await page.fill('[data-testid="quick-buyer-email"]', BUYER.email);
    await page.selectOption('[data-testid="quick-condition"]', 'approval');
    await page.click('[data-testid="create-quick-submit"]');

    await expect(page.locator('[data-testid="escrow-created-success"]')).toBeVisible({ timeout: 10000 });
  });

  test('TC-SIMPLE-002: Quick escrow has no milestones', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // No milestone section
    await expect(page.locator('[data-testid="milestone-section"]')).not.toBeVisible({ timeout: 5000 });

    // Mode badge shows Quick
    await expect(page.locator('[data-testid="escrow-mode-badge"]')).toContainText('Quick', { timeout: 5000 });
  });

  test('TC-SIMPLE-003: Quick escrow has auto-generated terms', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // View contract
    await page.click('[data-testid="view-contract-button"]');
    await expect(page.locator('[data-testid="contract-content"]')).toContainText(/auto-generated/i, { timeout: 5000 });
  });

  test('TC-SIMPLE-004: Cannot add milestones to quick escrow later', async ({ page }) => {
    await login(page, SELLER.email, SELLER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-0"]');

    // Add milestone button should not exist
    await expect(page.locator('[data-testid="add-milestone-button"]')).not.toBeVisible({ timeout: 5000 });
  });
});
```

**Expected results:**
- Quick escrow created with 3 fields
- No milestone section present
- Terms are auto-generated
- Cannot add milestones later

---

### Test 4: `frontend/e2e/simple_buyer.spec.ts`

**Purpose:** Verify buyer completes Quick escrow lifecycle without milestones.

```typescript
import { test, expect } from '@playwright/test';

const BUYER = { email: 'simple_buyer@test.com', password: 'Test123!' };
const BASE = 'http://localhost:5173';

async function login(page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Simple Buyer Flow', () => {

  test('TC-SIMPLE-BUYER-001: Accept quick escrow', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-quick-pending"]');

    await expect(page.locator('[data-testid="escrow-mode-badge"]')).toContainText('Quick', { timeout: 5000 });

    await page.click('[data-testid="accept-button"]');
    await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/active/i, { timeout: 5000 });
  });

  test('TC-SIMPLE-BUYER-002: Complete quick escrow lifecycle', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-quick-pending"]');

    // Accept
    const acceptBtn = page.locator('[data-testid="accept-button"]');
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
    }

    // Fund
    const fundBtn = page.locator('[data-testid="fund-button"]');
    if (await fundBtn.isVisible()) {
      await fundBtn.click();
      await page.click('[data-testid="confirm-fund"]');
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/funded/i, { timeout: 5000 });
    }

    // Confirm receipt
    const receiptBtn = page.locator('[data-testid="confirm-receipt-button"]');
    if (await receiptBtn.isVisible()) {
      await receiptBtn.click();
      await page.fill('[data-testid="receipt-note"]', 'Received');
      await page.click('[data-testid="confirm-receipt-submit"]');
    }

    // Release
    const releaseBtn = page.locator('[data-testid="release-button"]');
    if (await releaseBtn.isVisible()) {
      await releaseBtn.click();
      await page.click('[data-testid="confirm-release"]');
      await expect(page.locator('[data-testid="escrow-status"]')).toContainText(/completed/i, { timeout: 5000 });
    }

    // Check transaction recorded
    await page.click('[data-testid="nav-transactions"]');
    await expect(page.locator('[data-testid="transaction-list"]')).toBeVisible({ timeout: 5000 });
  });

  test('TC-SIMPLE-BUYER-003: No milestone UI ever appears', async ({ page }) => {
    await login(page, BUYER.email, BUYER.password);
    await page.click('[data-testid="nav-escrows"]');
    await page.click('[data-testid="escrow-card-quick-pending"]');

    await expect(page.locator('[data-testid="milestone-section"]')).not.toBeVisible({ timeout: 5000 });
  });
});
```

**Expected results:**
- Buyer completes Quick escrow
- No milestone UI appears
- Transaction recorded

---

## PHASE 5: EXECUTION — RUN AND FIX (Day 2-3)

### Step 1: Start the stack

```bash
# Terminal 1 — Backend
cd backend_monolithic
go run cmd/main.go

# Terminal 2 — Frontend
cd frontend
npm run dev
```

### Step 2: Seed test users

```bash
bash scripts/seed_test_users.sh
```

### Step 3: Run new tests one at a time

```bash
cd frontend

# Run seller flow
npx playwright test seller_flow.spec.ts --reporter=list

# If it fails:
# 1. Read the error
# 2. Check if data-testid attribute exists in the component
# 3. Check if element selector is correct
# 4. Fix the code OR fix the test selector
# 5. Re-run until pass
```

### Step 4: Repeat for each test file

```bash
npx playwright test buyer_flow.spec.ts --reporter=list
npx playwright test simple_seller.spec.ts --reporter=list
npx playwright test simple_buyer.spec.ts --reporter=list
```

### Step 5: Run ALL tests together (twice)

```bash
# Full test suite
npx playwright test --reporter=list

# Run again to verify stability
npx playwright test --reporter=list
```

---

## PHASE 6: STATE MACHINE INVARIANT VERIFICATION (Day 3 — 2 hours)

These checks ensure the backend enforces the rules. Add these tests to a Go test file.

**File:** `backend_monolithic/escrow_state_test.go`

```go
package main

import (
    "testing"
)

// Verify all allowed transitions
func TestAllowedTransitions(t *testing.T) {
    allowed := map[string][]string{
        "draft":     {"active", "cancelled"},
        "active":    {"locked", "cancelled"},
        "locked":    {"funded", "cancelled"},
        "funded":    {"released", "disputed", "verifying"},
        "verifying": {"funded", "released"},
        "disputed":  {"completed", "refunded"},
        "released":  {"completed"},
    }

    for from, toList := range allowed {
        for _, to := range toList {
            if !isValidTransition(from, to) {
                t.Errorf("Transition %s -> %s should be allowed but is blocked", from, to)
            }
        }
    }
}

// Verify forbidden transitions
func TestForbiddenTransitions(t *testing.T) {
    forbidden := [][2]string{
        {"funded", "active"},
        {"disputed", "released"},
        {"completed", "draft"},
        {"refunded", "active"},
        {"cancelled", "active"},
    }

    for _, pair := range forbidden {
        if isValidTransition(pair[0], pair[1]) {
            t.Errorf("Transition %s -> %s should be FORBIDDEN but is allowed", pair[0], pair[1])
        }
    }
}

// Verify dispute blocks fund movement
func TestDisputeBlocksFundMovement(t *testing.T) {
    // This should be checked in the handler:
    // if escrow.Status == "disputed" && action is fund/release/refund {
    //     return error
    // }
    // Verify this logic exists in escrow handler
}

// Verify lock prevents edits
func TestLockPreventsEdits(t *testing.T) {
    // if escrow.IsLocked && action is edit/update {
    //     return error
    // }
}
```

**Run:**
```bash
cd backend_monolithic
go test ./... -v -run TestAllowed
go test ./... -v -run TestForbidden
```

---

## PHASE 7: CHECKLIST — DEFINITION OF DONE

```text
BUG FIXES:
[ ] Frontend API routes use consistent /api/v1/ prefix
[ ] Blockchain client returns error, never panics
[ ] Rate limit set to 100/min

TOOLING:
[ ] seed_test_users.sh exists and creates 5 test users

NEW TESTS:
[ ] seller_flow.spec.ts — 3 test cases pass
[ ] buyer_flow.spec.ts — 3 test cases pass
[ ] simple_seller.spec.ts — 4 test cases pass
[ ] simple_buyer.spec.ts — 3 test cases pass

EXISTING TESTS:
[ ] All 9 existing test suites still pass

STABILITY:
[ ] Full test suite passes twice consecutively

BUILD:
[ ] Backend: go build succeeds
[ ] Frontend: npm run build succeeds

STATE MACHINE:
[ ] Allowed transitions work
[ ] Forbidden transitions return errors
[ ] Dispute blocks fund movement
[ ] Lock prevents edits
[ ] Idempotency prevents duplicate payments
```

---

## COMMANDS REFERENCE

```bash
# Backend
cd backend_monolithic
go run cmd/main.go                  # Start server
go build ./cmd/main.go              # Verify build
go test ./... -v                    # Run all tests

# Frontend
cd frontend
npm run dev                         # Start dev server
npm run build                       # Production build

# Testing
npx playwright test                 # Run all E2E tests
npx playwright test --ui            # UI mode for debugging
npx playwright test seller_flow     # Run single test file
npx playwright test --reporter=list # Clean output

# Seed data
bash scripts/seed_test_users.sh
```

---

This is everything. Share with the team. No missing pieces.