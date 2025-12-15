# Collaborative Sketch

A realtime collaborative whiteboard application where users can draw together.

## Features

- **Authentication** - Register/login with email verification (OTP)
- **Rooms** - Create public/private sketch rooms
- **Invite** - Share room code to invite collaborators
- **Realtime Drawing** - See others draw live with cursor presence
- **Tools** - Pen, eraser, line, rectangle, circle, triangle, arrow, diamond, text
- **Customization** - 12 colors, adjustable stroke width
- **Chat** - In-room real-time chat
- **Undo/Redo** - Canvas history support
- **Admin Panel** - User and room management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB Atlas |
| Testing | Jest, Playwright |

## Prerequisites

- Node.js >= 18.x
- MongoDB Atlas account (or local MongoDB)
- Gmail account (for SMTP email)

## Installation

### 1. Clone repository
```bash
git clone https://github.com/cuchim123123/advanced-sketch.git
cd advanced-sketch
```

### 2. Install dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Configure environment

Create `server/.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM="App Name <your-email@gmail.com>"
```

> **Note**: For Gmail, you need to create an [App Password](https://support.google.com/accounts/answer/185833)

### 4. Run the application

**Option A: Run from root (recommended)**
```bash
cd advanced-sketch
npm start
```

**Option B: Run separately**
```bash
# Terminal 1 - Backend
cd server
npm run dev    # http://localhost:5000

# Terminal 2 - Frontend
cd client
npm run dev    # http://localhost:3000
```

### 5. Access the app
Open http://localhost:3000 in your browser

## Demo Account

**Admin account for testing:**
| Field | Value |
|-------|-------|
| Username | `admin123` |
| Password | `TDTU123123` |

> Admin panel accessible at http://localhost:3000/admin after login

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Client    │◄──────────────────►│   Server    │
│   (React)   │     REST API       │  (Express)  │
└─────────────┘                    └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │   MongoDB   │
                                   └─────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/rooms | Create room |
| GET | /api/rooms | List user's rooms |
| GET | /api/rooms/:code | Get room by code |
| POST | /api/rooms/:code/join | Join room |
| DELETE | /api/rooms/:code | Delete room |

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| room:join | Client→Server | Join a room |
| room:state | Server→Client | Initial room state |
| draw:stroke | Bidirectional | Drawing data |
| cursor:move | Bidirectional | Cursor position |
| user:joined | Server→Client | User joined room |
| user:left | Server→Client | User left room |

## Running Tests

### Backend Tests (Jest)
```bash
cd server
npm test                    # Run all 303 tests
npm test -- --coverage      # With coverage report
```

### E2E Tests (Playwright)
```bash
cd client
npx playwright test                 # Run all 48 tests (headless)
npx playwright test --headed        # Run with browser visible
npx playwright show-report          # View HTML report
```

### Test Summary
| Test Type | Count | Framework |
|-----------|-------|-----------|
| Unit Tests | ~150 | Jest |
| Integration Tests | ~60 | Jest + Supertest |
| Socket.IO Tests | ~60 | Jest |
| Contract Tests | 19 | Jest |
| E2E Tests | 48 | Playwright |
| **Total** | **351** | |

## Project Structure

```
advanced-sketch/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand state management
│   │   ├── services/       # API services
│   │   └── hooks/          # Custom React hooks
│   └── e2e/                # Playwright E2E tests
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   ├── socket/         # Socket.IO handlers
│   │   ├── middleware/     # Express middleware
│   │   └── __tests__/      # Jest tests
│   └── .env                # Environment variables
├── SPEC.md                 # API specification
└── README.md               # This file
```

