# SafeDeal Task Plan - Backend_monolithic Enhancements

## Information Gathered
**Architecture**: Backend_monolithic Fiber app (`/internal/handlers/`, models, blockchain client).

**Current**:
- No emails (notification_handler InviteUser logs only).
- EscrowHandler: create/accept/confirm, blockchain partial.
- docker-compose.yml: app env ready.
- Frontend i18n/locales ready.
- E2E Playwright tests fail w/o backend.

**Task Requirements**:
- Gmail `safedeal.no.reply@gmail.com` emails (env/docker).
- Invites no-account users on escrow create.
- Emails updates/milestones.
- Deposits create/accept role-based.
- All statuses blockchain.
- Ultra: dispute clause, print formal w/ hash/chain ref.

## File-Level Plan
| File | Changes |
|------|---------|
| docker-compose.yml | Add SMTP_HOST=smtp.gmail.com etc. |
| Backend_monolithic/pkg/mailer/mailer.go | Gomail SendEmail. |
| internal/models/escrow.go | EscrowHash, InviteSent. |
| internal/handlers/notification_handler.go | InviteUser → mailer, SendEscrowUpdate. |
| internal/handlers/escrow_handler.go | Create: hash, invite seller email, status email.<br>All setEscrowStatus → email/blockchain. |
| Frontend locales/en.json | dispute_clause keys. |
| Frontend Print | Add hash/Tx to doc.

## TODO Steps (14)
1. docker env ✅
2. mail
