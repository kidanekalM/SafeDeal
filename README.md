# SafeDeal - Hybrid Escrow Platform

## Overview
SafeDeal is a **hybrid escrow platform** that combines traditional payment systems (Chapa for Ethiopian Birr transactions) with blockchain verification for enhanced security and transparency. The platform ensures secure transactions between buyers and sellers while maintaining regulatory compliance.

## Key Features
- **Hybrid Payment System**: Uses Chapa for ETB transactions while recording state on blockchain for verification
- **Multi-party Escrow**: Supports buyer, seller, and mediator roles
- **Milestone-based Payments**: Releases funds upon completion of agreed-upon milestones
- **Dispute Resolution**: Built-in mediation and resolution mechanisms
- **Tamper-Proof Records**: Blockchain anchoring for immutable transaction records
- **Real-time Notifications**: WebSocket-based communication system
- **Multi-language Support**: Internationalization for broader accessibility

## Tech Stack
- **Frontend**: TypeScript, React, Tailwind CSS
- **Backend**: Go with Fiber framework
- **Database**: PostgreSQL with GORM
- **Blockchain**: Ethereum integration for state verification
- **Payment Gateway**: Chapa for Ethiopian Birr transactions
- **Message Broker**: RabbitMQ for event-driven architecture
- **Real-time Communication**: WebSocket connections
- **Authentication**: JWT-based with refresh tokens

## Architecture
The platform implements a hybrid approach combining:
1. **Traditional Financial Layer**: Chapa handles ETB transactions ensuring regulatory compliance
2. **Blockchain Verification Layer**: Records transaction hashes and state changes on Ethereum for immutable proof

## Getting Started

1. Clone the repository
2. Install dependencies for both frontend and backend
3. Set up environment variables (Chapa API key, Ethereum RPC, DB connections)
4. Start the monolithic backend service
5. Access the API at `http://localhost:8080`

## Security Features

- Private keys encrypted with AES-256
- All webhook calls validated (Chapa signature verification)
- JWT refresh token rotation with Redis blacklist
- PostgreSQL passwords and private keys injected via environment variables

## Future Scalability

While currently implemented as a monolith, the modular design allows for potential future decomposition into microservices. The clear module boundaries make it possible to extract services over time if scaling demands require it.

## License

This project is licensed under the MIT License - see the LICENSE file for details.