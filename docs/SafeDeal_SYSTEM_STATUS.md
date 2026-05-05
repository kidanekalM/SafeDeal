# SafeDeal System Status & Context Reference

**Last Updated:** `date`
**Purpose:** Complete handover reference. Describes current architecture, status, key files, and feature mapping. **EDIT ONLY ON MAJOR FEATURE CHANGES.**

## Architecture Overview

### Backend (Backend_monolithic/ - Go/Fiber/GORM/Postgres)
```
cmd/main.go (entrypoint)
├── internal/
│   ├── models/ (GORM entities)
│   │   ├── user.go [COMPLETE] - Users, BankDetails, ActivationToken
│   │   ├── escrow.go [COMPLETE] - Escrow workflows, Contacts
│   │   ├── transaction.go - Payments (CBE/Chapa)
│   │   ├── milestone.go, review.go, notification.go [COMPLETE]
│   ├── handlers/ [ALL COMPLETE]
│   │   ├── user_handler.go - Auth/Registration/Login/Profile
│   │   ├── escrow_handler.go - Create/Get/Update/Cancel/Dispute/Release
│   │   ├── payment_handler.go - Verify/Chapa integration
│   │   ├── milestone_handler.go, ratings_handler.go
│   │   └── notification_handler.go
│   ├── routes/routes.go [COMPLETE] - All API endpoints
│   ├── auth/, blockchain/, rabbitmq/ [INTEGRATED]
│   └── utils/ - Helpers
├── Makefile, Dockerfile, docker-compose.yml
└── Run: cd Backend_monolithic && go run cmd/main.go
```

**Key Features Implemented:**
- JWT Auth (register/login/refresh)
- Escrow lifecycle (Pending→Funded→Active→Released/Disputed/Refunded)
- Blockchain integration (ETH wallet gen, tx hash tracking)
- Payments: CBE verification, Chapa
- Milestones, Ratings/TrustScore, Real-time chat (WebSocket)
- Notifications (email/SMS queue)
- Search/Users, Profile/Bank update
- **NO healthcare/FP code yet** - Ready for extension.

### Frontend (Frontend/ - React/Vite/TS/Tailwind/Playwright)
```
src/
├── pages/ [COMPLETE escrow flows]
│   ├── AuthPage.tsx, Dashboard.tsx, CreateEscrow.tsx
│   ├── EscrowDetails.tsx (milestones, chat, print)
│   ├── Profile.tsx, TransactionHistory.tsx, UserSearch.tsx
│   └── AdminDashboard.tsx
├── components/ [COMPLETE]
│   ├── AuthForm.tsx, PaymentModal.tsx, ChatModal.tsx
│   ├── PrintEscrow.tsx (PDF export), NotificationCenter.tsx
│   └── ProtectedRoute.tsx (auth guard)
├── store/ (Zustand) - auth/escrow/notification
├── e2e/ [PASSING] - buyer_flow.spec.ts, escrow_flows.spec.ts, etc.
└── Run: cd Frontend && npm run dev
```

**Key Features:**
- Full escrow CRUD/UI flows
- Real-time updates (escrow status, chat, notifications)
- Print contracts, E2E tested
- i18n (Amharic/English)
- Responsive, mobile-ready

## Feature Mapping to MASTER DOCS
| MASTER DOC Section | SafeDeal Implementation | Status |
|--------------------|------------------------|--------|
| Family Planning Flows (Sections 5-11) | **NOT IMPLEMENTED** - New module needed | Planned |
| Patient Registration | Extend User model + FP fields | Pending |
| Triage/Consultation Nodes | New Visit model (escrow-like state machine) | Pending |
| Scenarios (FP-1 to FP-7) | API endpoints + Frontend wizards | Pending |
| Data Fields (Sec 9) | GORM fields in Patient/Visit | Pending |

## Deployment & Testing
- **Dev**: Backend: `go run cmd/main.go` (port 8080). Frontend: `npm run dev` (port 5173)
- **Build**: Backend: `go build -o backend cmd/main.go`. Frontend: `npm run build`
- **Tests**: Backend: `go test ./...`. Frontend: `npx playwright test`
- **DB**: Postgres (auto-migrate on startup)
- **No env changes needed** - Uses existing .env (JWT_SECRET_KEY, DB_URL, etc.)

## Extension Guidelines
1. **New Features**: Add to models/handlers/routes following escrow pattern.
2. **Healthcare/FP**: 
   - models/patient.go (extend User)
   - handlers/healthcare_handler.go
   - pages/FPDashboard.tsx, components/FPForms/
3. **Preserve**: Don't modify existing escrow flows/auth/payments.
4. **Blockchain**: Reuse internal/blockchain/ for any FP inventory/escrows.

**This doc auto-informs any developer of full system state. Updated on feature changes only.**
