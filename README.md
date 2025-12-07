# Collaborative Sketch

A realtime collaborative whiteboard application where users can draw together.

## Features

- **Authentication** - Register/login with email & password
- **Rooms** - Create sketch rooms with optional password protection
- **Invite** - Share room code or link to invite collaborators
- **Realtime Drawing** - See others draw live with cursor presence
- **Tools** - Pen, eraser, line, rectangle, circle
- **Customization** - 12 colors, adjustable stroke width
- **Persistence** - Save and load sketch history

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS, Zustand |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB |

## Quick Start

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment
# Edit server/.env with your MongoDB URI

# Run (in separate terminals)
cd server && npm run dev    # http://localhost:5000
cd client && npm run dev    # http://localhost:3000
```

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
