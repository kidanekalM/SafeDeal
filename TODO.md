# SafeDeal Project Roadmap - Investor-Ready & User-Centric

## Objective
Refine SafeDeal into a highly intuitive, "trust-first" platform that scales from simple peer-to-peer deals to comprehensive corporate contracts.

## Phase 1: High-Impact UX & Trust (Immediate Priority)
- [ ] **Onboarding Flow**:
    - Force profile creation immediately after registration (Name, Profession, Bank Details).
    - Add a 3-step lightweight guided tour for new users.
- [ ] **Simplified Navigation**:
    - Audit and remove redundant sidebar/menu items.
    - Add "Next Action Required" section to the dashboard top.
- [ ] **Trust Indicators**:
    - Implement a simple User Trust Score (based on completed escrows).
    - Add "Verified" badges and "Funds Secured" banners in Escrow Details.

## Phase 2: Refined Escrow Workflow
- [ ] **Creation Wizard Polish**:
    - Remove redundant cards/whitespace in `CreateEscrow.tsx`.
    - Implement "Templates" (Freelance, Sales, Services) with pre-filled terms.
    - Default to a 2-step "Quick Escrow" flow; hide advanced options behind a toggle.
- [ ] **Collaborative Editing**:
    - Allow counterparties to suggest changes in chat.
    - Creator can edit terms *until* both parties "Accept & Lock".
    - Once locked, terms are immutable and logged to blockchain.
- [ ] **Legal & Compliance**:
    - Add "Print/Download Agreement" (PDF) once locked.
    - Clarify Mediator vs. Resolver roles in the UI.

## Phase 3: Enhanced Payments & Verification
- [ ] **Dual Payment Channels**:
    - **Chapa**: Standard automated flow.
    - **Bank Transfer (CBE)**: Buyer uploads receipt -> Verifier module authenticates -> Escrow status updates.
- [ ] **Fee System**:
    - Implement a configurable platform fee (%) shown clearly before payment.

## Phase 4: Auditability & AI
- [ ] **Deep Blockchain Integration**:
    - Log major actions (Acceptance, Milestone Approval, Dispute) to Sepolia.
    - Add "View Proof" button (linked to Etherscan) with user-friendly labeling.
- [ ] **AI Risk Management**:
    - Real-time risk warnings during creation (e.g., "Amount too high for unverified user").
    - Pre-dispute sentiment detection in chat.

## Phase 5: Technical & Mobile
- [ ] **Mobile-First Audit**: Ensure all core flows are flawless on small screens.
- [ ] **PWA Support**: Basic manifest and service worker for "Add to Home Screen".

---
**Current Status:** [!] In Progress | **Last Updated:** March 18, 2026
