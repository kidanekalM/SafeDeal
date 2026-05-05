# SafeDeal - Crypto-Native Escrow Platform

SafeDeal is a blockchain-driven hybrid escrow platform designed to solve fund security and regulatory compliance challenges in cross-border/local high-trust transactions. The platform combines decentralized state verification with traditional payment methods to ensure security and transparency.

## Core Architecture

The platform follows a microservices architecture with event-driven communication via RabbitMQ, supporting a complete escrow lifecycle from creation to completion with dispute resolution.

### 1. Parties & Identity

**Primary Parties**
- Depositor / Buyer
  - Address (0x...)
  - Contact Reference
- Beneficiary / Service Provider
  - Address (0x...)
  - Contact Reference

**Escrow Agent**
- Agent Address
- Agent Identifier

**Authorized Representatives**
- Address
- Scope (view / approve / dispute)

### 2. Agreement Core

- Escrow ID
- Escrow Type: Service-for-Payment
- Sub-Type
- Underlying Agreement Reference (hash or URI)
- Governing Rules (clause reference, not full legal)

### 3. What Is Held

- Amount (in native token, e.g., ETH)
- Token Standard (if ERC-20)
- Contract/Account Holding Address
- Deposit Transaction Hash
- Total Funded
- Available Balance
- Reserved (per milestone)

### 4. What Is Owed By Each Party

**Obligation Record**
- Obligation ID
- Responsible Party
- Type: Service Performance / Payment / Approval

**Service Obligation**
- Clear Description of Work
- Performance Period (start → deadline)

**Acceptance Criteria**
- Measurable Standard
- Verification Method

**Rejection Conditions**
- Defined Non-Conformance

**Cure Terms**
- Revision Window
- Resolution Deadline

### 5. Milestones & Payment Mapping

**Milestone Record**
- Milestone ID
- Description
- Linked Obligation
- Due Date

**Payment Mapping**
- Allocated Amount
- Percentage of Total

**Completion Trigger**
- Required Approval(s)
- Required Document/Proof Hash

**Status**
- Pending
- Submitted
- Under Review
- Accepted
- Rejected
- Released

### 6. Release Conditions

**Condition Types**
- Explicit Buyer Approval
- Auto-Acceptance (timeout)
- Third-Party Verifier Signature

**Approval Rules**
- Single Signature
- Multi-Signature

**Time Logic**
- Review Window (e.g., 7 days)
- Auto-Release After Timeout

### 7. Acceptance & Timeout Outcomes

- **Accepted** → Funds released to provider
- **Rejected** → Reason logged, cure period starts
- **No Response (Timeout)** → Auto-accept or Escalation

### 8. Dispute Handling

**Dispute Record**
- Dispute ID
- Raised By
- Reason Hash/Reference

**Effect**
- Funds Frozen

**Resolution**
- Agent Decision
- Arbitrator Signature
- Outcome: Release / Refund / Split

### 9. State Lifecycle

1. Created
2. Funded
3. Active
4. Milestone Under Review
5. Partially Released
6. Dispute
7. Completed
8. Cancelled (refunded)

### 10. Event Log (Immutable)

Per event:
- Timestamp
- Event Type
- Actor Address
- Related Milestone/Dispute ID
- Transaction Hash (if on-chain action)

## Technical Stack

- **Frontend**: TypeScript/React with Vite build system
- **Backend**: Golang with Fiber web framework
- **Blockchain**: Ethereum Sepolia Testnet with Solidity contracts
- **Payment Gateway**: Chapa (Ethiopian local compliant payment)
- **Message Broker**: RabbitMQ for event-driven architecture
- **Database**: PostgreSQL for main business data
- **Cache/Session**: Redis for JWT blacklists and session storage
- **Service Discovery**: HashiCorp Consul
- **Authentication**: JWT with refresh token rotation
- **Real-time Communication**: WebSocket for chat and notifications

## Microservices Architecture

- **API Gateway**: Unified routing, auth, rate limiting (Fiber + middleware)
- **Escrow Service**: Core escrow logic and state management
- **Payment Service**: Payment processing and verification
- **Chat Service**: Real-time communication between parties
- **Notification Service**: Multi-channel notifications (email, WebSocket, webhook)
- **Blockchain Adapter**: Ethereum RPC interaction and contract management
- **AI Arbitrator**: Experimental AI-assisted dispute resolution

## Getting Started

1. Clone the repository
2. Install dependencies for both frontend and backend
3. Set up environment variables (Chapa API key, Ethereum RPC, DB connections)
4. Start services using Docker Compose
5. Access the API gateway at `http://localhost:8080`

## Security Features

- Private keys encrypted with AES-256
- All webhook calls validated (Chapa signature verification)
- JWT refresh token rotation with Redis blacklist
- PostgreSQL passwords and private keys injected via environment variables

## Scaling Layers (Future Implementation)

- Enhanced Identity (ENS names, decentralized identity)
- Advanced Party Structures (multi-sig buyers, DAO treasury participation)
- Token & Chain Features (ERC-20/721/1155 support, multi-chain tracking)
- Rich Agreement Layer (legal text on Arweave/IPFS)
- Advanced Release Logic (oracle-triggered release, ZK-proof of completion)
- Communications Layer (encrypted messaging, dispute evidence on IPFS)
- Analytics & Audit (comprehensive ledger export)
- Compliance features (KYC, sanctions screening)
- Recovery & Fallback (social recovery, time-locked overrides)

## License

This project is licensed under the MIT License - see the LICENSE file for details.