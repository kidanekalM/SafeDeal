# SafeDeal Frontend

A modern React + TypeScript frontend for the SafeDeal escrow platform.

## Features

- 🔐 **Authentication**: Login, registration, and profile management
- 💰 **Escrow Management**: Create, view, and manage escrow transactions
- 💬 **Real-time Chat**: WebSocket-based communication during transactions
- 🔔 **Notifications**: Real-time notifications for escrow updates
- 💳 **Payment Integration**: Chapa payment processing
- 👥 **User Search**: Find and connect with other users
- 📊 **Transaction History**: View all payment transactions
- 🎨 **Modern UI**: Responsive design with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend services running (optional for basic UI)

### Installation

1. Navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Backend Integration

The frontend is fully integrated with the backend services:

- **User Service**: Authentication and profile management
- **Escrow Service**: Escrow transaction management
- **Payment Service**: Payment processing and history
- **Chat Service**: Real-time messaging
- **Notification Service**: Real-time notifications

### Backend Configuration

Set the backend URL in your environment variables:

```bash
# .env.local
VITE_API_URL=http://localhost:8080
```

## Project Structure

```
Frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── store/              # State management (Zustand)
│   ├── lib/                # API client and utilities
│   ├── types/              # TypeScript type definitions
│   └── assets/             # Static assets
├── public/                 # Public assets
└── index.html             # HTML template
```

## Key Components

- **Layout**: Main application layout with navigation
- **RealTimeChat**: WebSocket-based chat component
- **NotificationCenter**: Real-time notifications
- **PaymentModal**: Payment processing interface
- **AuthForm**: Authentication forms

## API Integration

The frontend uses a centralized API client (`lib/api.ts`) with:

- Automatic token refresh
- Request/response interceptors
- Error handling
- WebSocket connections

## Development

### Testing

### End-to-End Tests (Playwright)

SafeDeal uses Playwright for end-to-end testing of core user flows.

1.  **Install Playwright Browsers**:
    ```bash
    npx playwright install
    ```

2.  **Run Tests**:
    ```bash
    npm run test:e2e
    ```

3.  **Core Test Flows**:
    - `auth.spec.ts`: Registration, Login, and Logout.
    - `dashboard.spec.ts`: Statistics, Navigation, and UI components.
    - `escrow.spec.ts`: Quick Escrow creation and AI risk warnings.

Tests are located in the `e2e/` directory and are configured to automatically start the Vite development server.

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Error Handling

The application includes comprehensive error handling:

- API errors are caught and displayed to users
- WebSocket connections gracefully handle backend unavailability
- Form validation with user-friendly error messages
- Loading states for better UX

## Notes

- The frontend will work without the backend running (with limited functionality)
- WebSocket features require the backend services to be running
- All API calls include proper error handling and loading states