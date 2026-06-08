# SafeDeal Backend Monolithic

SafeDeal is a blockchain-powered hybrid escrow platform designed to solve trust deficiency, fund security, and regulatory compliance challenges in cross-border/local digital transactions.

## Features

- **Hybrid Payment Escrow Process**: Buyer creates Escrow → Chapa payment (funds held by Chapa) → Seller confirms acceptance → Buyer confirms receipt → Chapa releases funds to Seller's bank account
- **Blockchain State Synchronization**: Automatically writes `AWAITING_PAYMENT` → `ACTIVE` → `CLOSED` states to the Sepolia testnet smart contract, providing publicly verifiable transaction lifecycle
- **User Ethereum Wallet Management**: Generates encrypted storage of Ethereum wallets on demand (private key AES-256 encrypted), supporting blockchain state signatures and verification
- **Event-Driven Collaboration**: RabbitMQ decouples services, enabling asynchronous broadcast and consumption of key events such as payment success, payout completion, and Escrow closure
- **Real-Time Bi-Directional Chat**: WebSocket chat enabled after Escrow acceptance by Seller (Gorilla WebSocket), with AI mediator (ai-service) assisting dispute resolution
- **Multi-Channel Notifications**: Email, WebSocket push, and in-app messages (Notification Service) covering key nodes (e.g., payment success, payout completion, dispute triggers)
- **Security Authentication System**: JWT dual-token (access + refresh) with Redis blacklists for forced session logout and token rotation

## Key Improvements: Optional Milestones and Approvers

The latest update introduces two significant enhancements to the escrow system:

1. **Optional Milestones**: Adding milestones during escrow creation is now optional. When milestones are provided, they enable splitting payments into multiple phases, allowing for better risk management in larger transactions.

2. **Flexible Approver Assignment**: 
   - The approver for each milestone is now optional by default
   - When no specific approver is assigned, the buyer (payer) becomes the default approver
   - This allows for self-approval when specialized verification is not needed
   - Alternatively, a specific user can be designated as the approver for each milestone

## API Endpoints

### Escrow Endpoints

- `POST /api/escrows` - Create a new escrow (with optional milestones)
- `GET /api/escrows/:id` - Get details of a specific escrow
- `GET /api/escrows` - Get all escrows for the authenticated user
- `PUT /api/escrows/:id/accept` - Accept an escrow (by seller)
- `PUT /api/escrows/:id/cancel` - Cancel an escrow (by buyer, before funding)
- `PUT /api/escrows/:id/confirm-receipt` - Confirm receipt and release funds
- `POST /api/escrows/:id/dispute` - Raise a dispute
- `GET /api/escrows/:id/dispute` - Get dispute information
- `PUT /api/escrows/:id/refund` - Process refund for disputed escrow
- `GET /api/escrows/contacts` - Get contacts associated with escrows

### Milestone Endpoints

- `POST /api/milestones` - Create a new milestone (within an escrow)
- `GET /api/milestones/:id` - Get details of a specific milestone
- `GET /api/escrows/:escrowId/milestones` - Get all milestones for an escrow
- `PUT /api/milestones/:id` - Update milestone details
- `PUT /api/milestones/:id/submit` - Submit milestone for approval (by seller)
- `PUT /api/milestones/:id/approve` - Approve a submitted milestone (by approver)
- `PUT /api/milestones/:id/reject` - Reject a submitted milestone (by approver)

### Payment Endpoints

- `POST /api/payments/initiate` - Initiate a payment for an escrow
- `GET /api/payments/transactions` - Get all transactions for the authenticated user

### User Endpoints

- `POST /register` - Register a new user
- `POST /login` - Login to the platform
- `GET /activate` - Activate account using email and code
- `PUT /profile` - Update user profile
- `PUT /bank-details` - Update bank details

### Real-time Communication Endpoints

- `GET /chat/ws/:id` - WebSocket endpoint for chat within an escrow
- `GET /notifications/ws` - WebSocket endpoint for notifications

## Technology Stack

- **Backend**: Golang (v1.23.4)
- **Framework**: Fiber (Web), gRPC (IPC), Gorilla WebSocket (Chat)
- **Blockchain**: Ethereum (Sepolia Testnet), Solidity (Escrow.sol)
- **Payment Gateway**: Chapa (ETB dedicated, similar to Stripe)
- **Message Middleware**: RabbitMQ
- **Database**: PostgreSQL
- **Cache**: Redis
- **Service Discovery**: HashiCorp Consul
- **Containerization**: Docker, Docker Compose
- **AI Service**: Python (ai-service with arbitrator.proto defining gRPC interface)

## Running the Application

1. Copy `.env.example` to `.env` and configure Chapa keys, Ethereum RPC URL, DB/Redis/RabbitMQ connection strings, etc.
2. Start all services: `docker-compose up --build`
3. API is accessible at `http://localhost:8080`

## Frontend Integration Notes

For the frontend implementation, ensure the following:

1. **Optional Milestone Creation**: When creating an escrow, provide an option to add milestones. If milestones are added, each milestone should have:
   - Title and description
   - Amount (which sums to the total escrow amount)
   - Optional due date
   - Optional approver (if not specified, the buyer becomes the approver)

2. **Milestone Display**: When viewing an escrow, show the milestones and their status (Pending, Funded, Submitted, Approved, Rejected, Released)

3. **Approval Workflow**: Sellers submit milestones for approval when work is complete, and approvers can approve or reject the milestone.

4. **Default Approver**: If no specific approver is selected, the buyer automatically becomes the approver for the milestone.