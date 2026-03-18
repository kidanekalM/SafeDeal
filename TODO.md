# SafeDeal Project TODO - Escrow Enhancements & Milestones

## Overview
Comprehensive roadmap for escrow improvements focusing on:
- Milestones with optional complexity (simple vs detailed toggle)
- Align CreateEscrow page with other pages (Dashboard, UserSearch styling/flow)
- Multi-step CreateEscrow wizard
- User search/add by email with invitation (\"email not found, invitation sent\")
- Court compliance attributes (jurisdiction, governing law, etc.)
- Frontend milestones visibility (detailed toggle)

**Current Status:** [!] In Progress | [x] TODO Created | Subsequent steps to be marked as completed.

## High-Level Milestones
1. **MVP (Core Functionality)** [x]
   - User search/invite integration
   - Basic milestones input
   - Court compliance fields
   - Backend schema/API support

2. **UI/UX Polish** [x]
   - Multi-step wizard for CreateEscrow
   - Consistent styling across pages
   - Detailed/simple milestones toggle UI

3. **Display & Tracking** [x]
   - Milestones visibility in EscrowDetails/AllEscrows
   - Invitation status tracking

4. **Advanced Features** [ ]
   - Compliance validation
   - Milestone progress tracking
   - Arbitrator integration

## Detailed Implementation Steps

### Phase 1: Preparation & Backend Updates [x]
- [x] Review/update Backend_monolithic/internal/models/escrow.go: Add milestones []Milestone, compliance struct (Jurisdiction string, GoverningLaw string, DisputeResolution string)
- [ ] Update proto/escrow/v1/escrow.proto: Matching fields (N/A for Monolith)
- [x] Backend/User-service: Enhance searchByEmailOrUsername -> if not found, trigger Notification-service invite
- [x] Backend/Notification-service: Add InviteUser(email) endpoint
- [x] Frontend/src/lib/api.ts: Add userApi.search(query), notificationApi.invite(email)

### Phase 2: Frontend CreateEscrow Improvements [x]
- [x] Frontend/src/pages/CreateEscrow.tsx:
  - Convert to 4-step wizard (using useState/stepper component):
    | Step 1: Role selection (buyer/seller/mediator)
    | Step 2: User search/add (search input -> dropdown results -> if not found: invite button -> toast \"Invitation sent\")
    | Step 3: Amount + Milestones (toggle detailed: dynamic add milestone {name, %, date}; simple: total)
    | Step 4: Conditions + Compliance (dropdown jurisdiction, textarea law) + Review
  - Align styling: Match Tailwind classes from Dashboard.tsx/UserSearch.tsx (Layout, icons lucide-react, form groups)
  - Update form schema/validation (zod) for new fields
- [ ] Create src/components/StepWizard.tsx, MilestoneInput.tsx for reusability (Implemented directly for now)
- [ ] src/store/escrowStore.ts: Zustand store for form state, milestones preview (Using local state/React Hook Form)

### Phase 3: Display Milestones [x]
- [x] Frontend/src/pages/EscrowDetails.tsx: Add Milestones section
- [x] Frontend/src/pages/AllEscrows.tsx: Milestone badges

### Phase 4: Testing & Polish [!]
- [ ] Unit tests: CreateEscrow form steps, milestone calc, invite flow
- [ ] E2E: Cypress/Playwright full escrow creation w/ search/not-found invite
- [x] Manual: Frontend `npm run dev`, Backend `go run`, test invite emails, milestones deploy to blockchain
- [x] UI Audit: Ensure CreateEscrow matches other pages (colors, spacing, responsive)

## Dependencies
- Backend services running (User, Notification, Escrow)
- Smart contract Escrow supports milestones/compliance params
- Tailwind/Reactive Forms up-to-date

## Progress Tracking
**Legend:** [ ] Todo | [x] Done | [!] In Progress | [?] Blocked

*Updated: March 18, 2026 - Completed core implementation of milestones, compliance, and invitation flow.*
