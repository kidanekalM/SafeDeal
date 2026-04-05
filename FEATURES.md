# SafeDeal - Comprehensive Feature List

SafeDeal is a hybrid escrow platform that combines traditional fiat payments with blockchain auditability and AI-powered dispute resolution.

## 1. User & Identity Management
- **Secure Authentication**: JWT-based login and registration system with automatic token refresh.
- **Account Activation**: Email-based (simulated) account activation workflow.
- **Automated Web3 Onboarding**: Every user is automatically assigned a unique Ethereum wallet upon registration.
- **Privacy-First Security**: Private keys are encrypted using AES-GCM before being stored in the database.
- **Profile Management**: Users can update personal details, professional information, and bank account details for payouts.
- TODO : make the users create their profile when either registering or right after registration
- **Global User Search**: Instant search by name or email to find counterparties for deals.
- **Invitation System**: "Invite-on-the-fly" feature—if a counterparty is not found by email, the system sends an invitation to join the platform.

## 2. Advanced Escrow Creation
- TODO when creating escrow there is a useless card taking large space that is not useful remove it 
- **Dynamic Workflow (Simple vs. Detailed)**:
    - **Simple Mode**: 3-step wizard for quick, straightforward transactions.
    - **Detailed Mode**: 6-step wizard for complex, high-stakes deals requiring legal and milestone-based oversight.
    - TODO: on the Detailed mode we should be able to have the option to add e-sign if it is not too difficult to implement and after the users have accepted they should be able to print the agreed ones who agreed what was agreeed etc.
    - TODO: also the users the ones that are in same escrow/invited to join the escrow should be able to suggest changes like i dont like the mileston... or the title this that in the chat and the creator should be able to edit it but after the agreement no one can edit anything.
- **Role-Based Creation**: Users can initiate escrows as a **Buyer**, **Seller**, or a neutral **Mediator**.
- **Mediator Integration**: Option to assign a specific third-party mediator to a deal for manual oversight and dispute resolution.
- TDOD: the mediator is the resolver, approver resolve this confusion
- **Legal Compliance Framework**:
    - Selectable **Jurisdiction** (e.g., Ethiopia, Kenya, International).
    - Defined **Governing Law** (e.g., Commercial Code of Ethiopia).
    - Customizable **Dispute Resolution** methods (AI, Formal Arbitration, or Mediation).
- **Flexible Terms**: Rich-text agreement conditions and contract terms collection.

## 3. Milestone-Based Payments
- **Deliverable Breakdown**: Ability to split a single escrow into multiple payable milestones.
- **Milestone Details**: Each milestone includes a title, detailed description, amount, and projected due date.
- **Automated Calculation**: Total escrow amount is dynamically calculated and synced from individual milestone amounts.
- **Lifecycle Management**: Milestones move through states: *Pending → Funded → Submitted → Approved/Rejected → Released*.
- **Role-Specific Actions**: Sellers submit evidence of work; Buyers (or designated Approvers) verify and approve for payment release.
- TODO: each milestone can have an approver assigned when approved by that person it goes directly
## 4. Payment & Blockchain Integration
- **Fiat Integration (Chapa)**: Support for Ethiopian Birr (ETB) payments via Chapa's secure gateway.
- **Hybrid Architecture**:
    - **Financials**: Handled via traditional banking/fiat gateways for stability.
    - **Auditability**: Every major state change (Creation, Funding, Release) is logged on the **Ethereum Sepolia Testnet**.
- **Immutable Evidence**: Blockchain transaction hashes are linked to every escrow, providing a permanent "Proof of Agreement" visible on Etherscan.
- TODO lets also do who did what on the ecscrow to the blockchain so we can have audit both local and blockchain
## 5. Dispute Resolution & AI
- **Smart Dispute System**: Structured dispute initiation requiring detailed reasoning and evidence.
- **AI Arbitrator**: A dedicated Python-based service using **Google Gemini** via gRPC to analyze chat history and contract terms to suggest or provide binding resolutions.
- **Manual Mediation**: Support for human mediators to step in and resolve conflicts using the platform's evidence trail.

## 6. Real-Time Communication
- **Escrow-Specific Chat**: Secure, real-time WebSocket chat rooms for every transaction.
- **Evidence Preservation**: All chat history is persisted and indexed for use in dispute resolution.
- **Live Notifications**: WebSocket-based notification system for instant updates on payment status, milestone approvals, and new deal invitations.

## 7. Dashboard & Analytics
- **Personal Command Center**: Overview of total transaction volume, active deals, and completed contracts.
- **Detailed Timeline**: Visual tracking of every stage in an escrow's lifecycle.
- **Transaction History**: Comprehensive log of all past payments and receipts with filtering capabilities.
- TDOO: simplify the sidemenu that are useless.
- TODO: After accepting the invitation or creating it the buyer should be prompted to either transfer to a banck accoount number / pay with chapa if they transfer to account number in cbe we should use the verifier module to authenticate the transfer aand update the status of that escrow if they use chapa we can use the callback already available.

## 8. Technical Infrastructure
- **Hybrid Backend**: Choice between a modular **Microservices Architecture** (Go + Python) or a consolidated **Monolithic Backend**.
- TODO - our backend is monolithic we only update that and let us not delete the other eone it is like a reference
- **Service Discovery**: **Consul** integration for managing microservice health and locations.
- **Message Broker**: **RabbitMQ** for asynchronous event-driven communication between services.
- **High-Performance Storage**: **PostgreSQL** for relational data, **Redis** for session management and caching.
- **Modern Frontend**: Built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Framer Motion** for a smooth, high-fidelity user experience.
- **Containerized Deployment**: Fully dockerized environment with multi-stage builds for production readiness.

## TODO from ChatGPT

- [ ] Implement “Quick Escrow” as the default (1–2 step flow) and hide advanced options behind an “Advanced” toggle
- [ ] Add escrow templates (Freelance, Product Purchase, Import/Export) with pre-filled values for fast creation

- [ ] Add simple escrow explainer modal for first-time users (non-technical, 1–2 sentences max)
- [ ] Add lightweight guided onboarding (max 3 steps, skippable)

- [ ] Force payment action immediately after escrow creation (no idle state)
- [ ] Add very clear payment status labels (Waiting / Secured / Action Needed)

- [ ] Implement user trust score (simple format: Low / Medium / High or 0–100)
- [ ] Display trust summary before joining an escrow (compact UI card)
- [ ] Add “Funds Secured” / “Escrow Protected” visual indicators

- [ ] Add “Agreement Summary” screen before final acceptance (clean, human-readable)
- [ ] Generate downloadable PDF contract after agreement is finalized
- [ ] Show “Locked Deal” state after agreement (no edits possible)

- [ ] Keep milestones hidden by default; only show when “Advanced” is enabled
- [ ] Add simple proof upload (image/file/video) for submissions with timestamps

- [ ] Add AI-powered risk warnings:
  - [ ] “This deal might be risky”
  - [ ] “Suggested safer structure” (1-click apply)
- [ ] Add pre-dispute detection (notify users before conflict escalates)

- [ ] Expand blockchain usage:
  - [ ] Log approvals, submissions, disputes
  - [ ] Add “View Proof” button (no technical jargon, label as “Tamper-proof record”)

- [ ] Optimize for mobile-first usage (all core flows)
- [ ] Convert to PWA (installable, fast load, low data usage)

- [ ] Add strong real-time notifications for key events (secured, approved, released)
- [ ] Optional SMS fallback for critical actions

- [ ] Improve invite message copy:
  - [ ] “You’ve received a secured payment—join to claim”
- [ ] Track referrals and enable simple reward (fee discount)

- [ ] Implement transaction fee system (configurable %)
- [ ] Show fee clearly before payment confirmation

- [ ] Track internal metrics:
  - [ ] Total transaction volume (GMV)
  - [ ] Escrow count
  - [ ] Completion rate
  - [ ] Dispute rate

- [ ] Add “Next Action Required” section in dashboard (focus user attention)