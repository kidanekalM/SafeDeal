# Production Readiness Checklist

## Auth and Session Safety
- Verify refresh-token flow does not loop on repeated 401s.
- Confirm refresh endpoint is excluded from interceptor retry recursion.
- Confirm logout clears local session state and blocks protected routes.

## Payment and Escrow State Consistency
- Validate state transitions: `Pending -> Verifying -> Funded -> Released/Disputed -> Refunded`.
- Ensure status-history entries are created for each transition.
- Verify Chapa and Transfer/CBE paths both populate transaction records.

## Trust Score Integrity
- Verify trust score increases on successful completion.
- Verify trust score penalties apply on dispute/refund outcomes.
- Validate trust insights endpoint returns expected aggregates.

## Dispute Operations
- Create dispute with reason/evidence and confirm lifecycle state updates.
- Resolve dispute with `release` and `refund` actions and verify status/audit.
- Confirm resolution note and actor metadata are persisted.

## Formal Agreement Export
- Download finalized agreement from released/refunded escrow.
- Confirm exported artifact includes parties, amounts, legal terms, milestones, and blockchain tx hash.

## Observability and Operational Checks
- Monitor 4xx/5xx rates for `/refresh-token`, payment verification, dispute resolution, and export endpoints.
- Add alerting for repeated auth refresh failures and payment verification failures.
- Capture structured logs for state transitions and dispute actions.

## Security a
- Validate endpoint authorization for buyer/seller/admin-only actions.
- Validate input sanitization on dispute reason/evidence and agreement fields.
- Validate idempotency expectations for verify/refund/dispute resolution operations.
