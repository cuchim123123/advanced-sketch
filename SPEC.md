# CoPad - Software Requirements Specification (SRS)

**Version:** 1.0  
**Date:** December 15, 2024  
**Document Type:** Software Requirements Specification  
**Project:** CoPad - Collaborative Sketching Platform

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [User Roles](#3-user-roles)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Models](#6-data-models)
7. [API Specification](#7-api-specification)
8. [Socket.IO Events Specification](#8-socketio-events-specification)
9. [Security Requirements](#9-security-requirements)
10. [Test Coverage Matrix](#10-test-coverage-matrix)
11. [Appendix](#11-appendix)

---

## 1. Introduction

### 1.1 Purpose
This document specifies the complete functional and non-functional requirements for **CoPad**, a real-time collaborative sketching platform. It serves as the authoritative reference for development, testing, and validation.

### 1.2 Scope
CoPad enables multiple users to:
- Create and manage collaborative drawing rooms
- Draw simultaneously with real-time synchronization
- Communicate via in-room chat
- Export drawings in multiple formats

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|------------|
| Room | A collaborative canvas workspace identified by unique 8-character code |
| Stroke | A single drawing element (pen path, shape, text, or image) |
| Session Participant | An active user connected to a room via WebSocket |
| Guest | Anonymous user who can join rooms without registration |
| Owner | The user who created a room (has management permissions) |
| OTP | One-Time Password for email/password operations |

---

## 2. System Overview

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React + Vite)                     │
├─────────────────────────────────────────────────────────────────┤
│  Canvas Component │ Socket Service │ Auth Store │ API Service   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTP/REST │ WebSocket (Socket.IO)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Server (Express + Socket.IO)                  │
├─────────────────────────────────────────────────────────────────┤
│  Auth Routes │ Room Routes │ Admin Routes │ Socket Handlers      │
├─────────────────────────────────────────────────────────────────┤
│  Auth Service │ Room Service │ Password Service │ OTP Service   │
│  Admin Service │ Auto-Save Service │ Room State Manager         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MongoDB Database                         │
├─────────────────────────────────────────────────────────────────┤
│   Users │ Rooms │ SketchHistory │ SessionParticipants │ OTPs    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS, Zustand |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB with Mongoose ODM |
| Authentication | JWT (JSON Web Tokens) |
| Real-time | Socket.IO with WebSocket transport |
| Email | Nodemailer (SMTP) |

---

## 3. User Roles

### 3.1 Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Guest** | Anonymous user | Join public rooms, draw, chat, view only |
| **User** | Registered, verified user | Create rooms, join any room, manage own rooms |
| **Room Owner** | Creator of a room | All User permissions + room settings, kick users, delete room, view history |
| **Admin** | System administrator | All permissions + user management, room management, statistics |

### 3.2 Role Hierarchy

```
Admin > Room Owner > User > Guest
```

### 3.3 Permission Matrix

| Action | Guest | User | Owner | Admin |
|--------|-------|------|-------|-------|
| View public rooms | ✓ | ✓ | ✓ | ✓ |
| Join room (via code) | ✓ | ✓ | ✓ | ✓ |
| Draw/Erase | ✓ | ✓ | ✓ | ✓ |
| Chat in room | ✓ | ✓ | ✓ | ✓ |
| Undo/Redo own strokes | ✓ | ✓ | ✓ | ✓ |
| Create room | ✗ | ✓ | ✓ | ✓ |
| Update room settings | ✗ | ✗ | ✓ | ✓ |
| Kick participants | ✗ | ✗ | ✓ | ✓ |
| Delete room | ✗ | ✗ | ✓ | ✓ |
| View room history | ✗ | ✗ | ✓ | ✓ |
| Restore snapshot | ✗ | ✗ | ✓ | ✓ |
| Clear canvas | ✗ | ✓ | ✓ | ✓ |
| Manage all users | ✗ | ✗ | ✗ | ✓ |
| View system statistics | ✗ | ✗ | ✗ | ✓ |

---

## 4. Functional Requirements

### 4.1 Authentication Module (FR-AUTH)

#### FR-AUTH-01: User Registration
**Description:** Users can create a new account with username, email, and password.

| Field | Type | Validation |
|-------|------|------------|
| username | String | Required, 3-30 chars, unique (case-insensitive) |
| email | String | Required, valid email format, unique |
| password | String | Required, minimum 6 characters |

**Flow:**
1. User submits registration form
2. System validates input and checks uniqueness
3. System creates user with `isEmailVerified = false`
4. System generates email verification token (expires in 24h)
5. System sends verification email
6. System returns JWT token and user data

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "ObjectId",
      "username": "string",
      "email": "string",
      "avatar": null,
      "phone": null,
      "role": "user",
      "isEmailVerified": false
    },
    "token": "JWT"
  }
}
```

**Error Conditions:**
| Code | Condition |
|------|-----------|
| 409 | Email already registered |
| 409 | Username already taken |
| 400 | Validation failed |

---

#### FR-AUTH-02: User Login
**Description:** Registered users can authenticate with email/username/phone and password.

**Precondition:** User must have verified email (`isEmailVerified = true`)

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| emailOrPhoneOrUsername | String | Email, username, or phone |
| password | String | Account password |

**Flow:**
1. System normalizes input (email lowercased, username trimmed)
2. System finds user by email OR username OR phone
3. System verifies password using bcrypt
4. System checks `isEmailVerified === true`
5. System returns JWT token and user data

**Error Conditions:**
| Code | Message |
|------|---------|
| 401 | Invalid credentials |
| 403 | Email verification required (custom error type) |

---

#### FR-AUTH-03: Email Verification
**Description:** Users verify their email by clicking a link sent to their inbox.

**URL Format:** `GET /api/auth/verify-email?uid={userId}&token={token}`

**Flow:**
1. System validates user exists
2. System checks email not already verified
3. System validates token hash matches stored hash
4. System checks token not expired (24h TTL)
5. System sets `isEmailVerified = true`
6. System clears verification token fields

**Error Conditions:**
| Code | Condition |
|------|-----------|
| 404 | User not found |
| 400 | Email already verified |
| 400 | Invalid verification token |
| 410 | Token expired |

---

#### FR-AUTH-04: Resend Verification Email
**Description:** Users can request a new verification email.

**Endpoint:** `POST /api/auth/resend-verification`

**Input:** `{ "email": "user@example.com" }`

**Preconditions:**
- User exists
- Email not already verified

---

#### FR-AUTH-05: Password Reset (Forgot Password)
**Description:** Users can reset their password via email.

**Flow:**
1. `POST /api/auth/forgot-password` with email or username
2. System generates reset token (15 min TTL)
3. System sends reset email with link
4. User clicks link: `/reset-password?uid={id}&token={token}`
5. `POST /api/auth/reset-password` with new password
6. System validates token and updates password

**Security:** Always returns success message to prevent user enumeration.

---

#### FR-AUTH-06: Change Password (Authenticated)
**Description:** Authenticated users can change their password.

**Endpoint:** `POST /api/auth/change-password`

**Input:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Validations:**
- Current password must match
- New password must be different from current
- New password minimum 6 characters

---

#### FR-AUTH-07: Check Availability
**Description:** Check if username or email is available during registration.

**Endpoint:** `GET /api/auth/check-availability?username={}&email={}`

**Response:**
```json
{
  "success": true,
  "data": {
    "username": { "value": "john", "available": true, "message": "Username is available" },
    "email": { "value": "john@example.com", "available": false, "message": "Email is already registered" }
  }
}
```

---

#### FR-AUTH-08: Get Profile
**Description:** Get current authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Authorization:** Bearer token required

---

#### FR-AUTH-09: Update Profile
**Description:** Update user profile fields.

**Endpoint:** `PUT /api/auth/profile`

**Updatable Fields:**
- `username` (must be unique)
- `avatar` (URL string)
- `phone` (valid phone format)

---

### 4.2 Room Module (FR-ROOM)

#### FR-ROOM-01: Create Room
**Description:** Authenticated users can create a new collaborative drawing room.

**Endpoint:** `POST /api/rooms`

**Input:**
| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| name | String | Required | Max 100 chars |
| maxParticipants | Number | 10 | 2-50 |
| isPublic | Boolean | false | - |
| canvasSettings | Object | Default | width, height, backgroundColor |

**Canvas Settings Defaults:**
```json
{
  "width": 1920,
  "height": 1080,
  "backgroundColor": "#ffffff"
}
```

**Flow:**
1. Generate unique 8-character room code (UUID prefix, uppercase)
2. Create room with owner = current user
3. Initialize SketchHistory with version 1, empty strokes
4. Return room data with code

**Room Code Generation:**
- Format: `XXXXXXXX` (8 uppercase alphanumeric characters)
- Collision handling: Retry up to 5 times on duplicate

---

#### FR-ROOM-02: Get User's Rooms
**Description:** Get list of rooms owned by current user.

**Endpoint:** `GET /api/rooms`

**Response includes:** Room ID, name, code, participant count, last active time

---

#### FR-ROOM-03: Get Public Rooms
**Description:** Get all public rooms visible to anyone.

**Endpoint:** `GET /api/rooms/public`

**Filter:** `isPublic = true AND isActive = true`

---

#### FR-ROOM-04: Get Room by Code
**Description:** Get room details by room code.

**Endpoint:** `GET /api/rooms/:code`

**Authorization:** Optional (guests allowed)

---

#### FR-ROOM-05: Join Room
**Description:** Join a room to participate in drawing.

**Endpoint:** `POST /api/rooms/:code/join`

**Validations:**
- Room exists
- Room is active (`isActive = true`)
- Room not full (`currentParticipants < maxParticipants`)

---

#### FR-ROOM-06: Update Room Settings
**Description:** Room owner can update room settings.

**Endpoint:** `PATCH /api/rooms/:code`

**Authorization:** Owner only

**Updatable Fields:**
- `name`
- `isPublic`
- `maxParticipants` (clamped to 2-50)

---

#### FR-ROOM-07: Delete Room
**Description:** Room owner can delete a room.

**Endpoint:** `DELETE /api/rooms/:code`

**Cascade Delete:**
- SketchHistory records
- SessionParticipant records
- In-memory room state

---

#### FR-ROOM-08: Get Room History
**Description:** Room owner can view snapshot history.

**Endpoint:** `GET /api/rooms/:code/history`

**Response:** List of versions with timestamps (last 20)

---

### 4.3 Drawing Module (FR-DRAW)

#### FR-DRAW-01: Drawing Tools
**Description:** Available drawing tools on the canvas.

| Tool | Type | Properties |
|------|------|------------|
| `pen` | Freehand | points[], color, strokeWidth, opacity |
| `eraser` | Freehand | points[], strokeWidth |
| `line` | Shape | startPoint, endPoint, color, strokeWidth |
| `rectangle` | Shape | startPoint, endPoint, color, strokeWidth |
| `circle` | Shape | startPoint (center), endPoint (radius point), color, strokeWidth |
| `triangle` | Shape | startPoint, endPoint, color, strokeWidth |
| `arrow` | Shape | startPoint, endPoint, color, strokeWidth |
| `diamond` | Shape | startPoint, endPoint, color, strokeWidth |
| `text` | Special | startPoint, text, fontSize, fontFamily, color |
| `image` | Special | startPoint, imageData (base64), width, height |
| `select` | Utility | For selecting/transforming strokes |
| `hand` | Utility | For panning canvas |

---

#### FR-DRAW-02: Stroke Data Structure
**Description:** Complete stroke object structure.

```typescript
interface Stroke {
  id: string;              // Unique identifier (UUID)
  userId: string;          // Creator's user ID
  tool: ToolType;          // Tool used
  
  // Common properties
  color?: string;          // Hex (#RRGGBB) or rgba()
  strokeWidth?: number;    // 1-100
  opacity?: number;        // 0-1
  rotation?: number;       // Degrees
  
  // For freehand tools (pen, eraser)
  points?: Array<{ x: number; y: number; pressure?: number }>;
  
  // For shape tools
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  
  // For text tool
  text?: string;           // Max 5000 chars
  fontSize?: number;       // 8-200
  fontFamily?: string;
  
  // For image tool
  imageData?: string;      // Base64, max 2MB
  width?: number;
  height?: number;
  
  // Metadata
  timestamp: Date;
  sequence: number;        // Server-assigned ordering
}
```

---

#### FR-DRAW-03: Stroke Validation
**Description:** Server-side validation for incoming strokes.

| Validation | Constraint |
|------------|------------|
| Max points per stroke | 10,000 |
| Max image size | 2 MB |
| Max text length | 5,000 chars |
| Stroke width range | 1-100 |
| Font size range | 8-200 |
| Color format | `#RGB`, `#RRGGBB`, or `rgba(...)` |

---

#### FR-DRAW-04: Undo/Redo
**Description:** Per-user undo/redo functionality.

**Behavior:**
- Each user has their own undo/redo stack
- Undo removes the user's last stroke
- Redo restores the last undone stroke
- Drawing a new stroke clears the redo stack
- Stacks are stored in-memory per room

---

#### FR-DRAW-05: Canvas Clear
**Description:** Clear all strokes from the canvas.

**Authorization:** Registered users only (not guests)

**Effect:** Broadcasts `draw:clear` to all participants

---

#### FR-DRAW-06: Stroke Reorder
**Description:** Change the z-order of strokes (bring to front, send to back).

**Event:** `draw:reorder`

**Data:** `{ strokeIds: string[] }` - New order of all strokes

---

### 4.4 Real-time Collaboration Module (FR-REALTIME)

#### FR-REALTIME-01: Live Cursor Tracking
**Description:** See other participants' cursor positions in real-time.

**Throttle:** 33ms (~30 FPS)

**Data:**
```json
{
  "userId": "string",
  "x": "number",
  "y": "number",
  "tool": "string"
}
```

---

#### FR-REALTIME-02: Live Drawing Preview
**Description:** See strokes being drawn by others in real-time.

**Behavior:**
- Preview strokes sent with `isPreview: true`
- Delta point updates (only new points since last emit)
- 50ms throttle for emissions
- Preview strokes cleared on `draw:complete`

---

#### FR-REALTIME-03: Conflict Resolution
**Description:** Handle concurrent edits from multiple users.

**Strategy:** Last-Write-Wins with sequence numbers

**Implementation:**
1. Server assigns incrementing sequence number to each stroke
2. Updates with higher sequence overwrite lower
3. Strokes maintain insertion order via Map + Array

---

#### FR-REALTIME-04: Participant Presence
**Description:** Track who is in the room.

**Events:**
- `user:joined` - When someone joins
- `user:left` - When someone leaves (or disconnects)
- Participant list included in `room:state`

**Participant Colors:** Random HSL colors assigned on join

---

### 4.5 Chat Module (FR-CHAT)

#### FR-CHAT-01: In-Room Chat
**Description:** Real-time text chat within a room.

**Event:** `chat:send` / `chat:message`

**Message Structure:**
```json
{
  "message": "string",
  "user": {
    "id": "string",
    "username": "string"
  },
  "timestamp": "ISO8601"
}
```

**Constraints:**
- Max message length: 1000 characters
- XSS sanitization applied (HTML entities escaped)
- Messages are ephemeral (not persisted)

---

### 4.6 Export Module (FR-EXPORT)

#### FR-EXPORT-01: Export Formats
**Description:** Export canvas in various formats.

| Format | Description |
|--------|-------------|
| PNG | Raster image from canvas |
| SVG | Vector graphics recreation |
| PDF | PDF document with canvas image |

**Filename:** `sketch-YYYY-MM-DD.{ext}`

---

### 4.7 OTP Module (FR-OTP)

#### FR-OTP-01: Send OTP
**Description:** Send OTP code to email for verification purposes.

**Endpoint:** `POST /api/auth/send-otp`

**Input:**
```json
{
  "email": "string",
  "purpose": "email_verification | password_reset | two_factor | login_verification"
}
```

**Constraints:**
- OTP length: 6 digits
- OTP TTL: 15 minutes
- Rate limit: 1 request per 60 seconds per email

---

#### FR-OTP-02: Verify OTP
**Description:** Verify submitted OTP code.

**Endpoint:** `POST /api/auth/verify-otp`

**Constraints:**
- Max 5 attempts per OTP
- Failed attempts decrement remaining count
- OTP deleted after max attempts exceeded

---

### 4.8 Admin Module (FR-ADMIN)

#### FR-ADMIN-01: User Statistics
**Description:** Get platform user statistics.

**Endpoint:** `GET /api/admin/users/stats`

**Response:**
```json
{
  "total": 1000,
  "guests": 200,
  "registered": 800
}
```

---

#### FR-ADMIN-02: User Management
**Description:** List and manage all users.

**Endpoints:**
- `GET /api/admin/users` - Paginated list with search
- `DELETE /api/admin/users/:userId` - Delete user

**Delete Cascade:**
- User's owned rooms (and their data)
- Remove from participated rooms
- Delete associated OTPs

**Constraint:** Cannot delete own account

---

#### FR-ADMIN-03: Room Statistics
**Description:** Get platform room statistics.

**Endpoint:** `GET /api/admin/rooms/stats`

**Response:**
```json
{
  "total": 500,
  "active": 50,
  "inactive": 450
}
```

---

#### FR-ADMIN-04: Room Management
**Description:** List and manage all rooms.

**Endpoints:**
- `GET /api/admin/rooms` - Paginated list with search
- `DELETE /api/admin/rooms/:roomId` - Delete room

---

### 4.9 Auto-Save Module (FR-AUTOSAVE)

#### FR-AUTOSAVE-01: Debounced Auto-Save
**Description:** Automatic persistence of room state.

**Configuration:**
- Debounce delay: 5 seconds after last change
- Max delay: 30 seconds (forced save)
- Save on last user disconnect

**Saved Data:**
- Current strokes array
- Version number

---

#### FR-AUTOSAVE-02: Snapshot History
**Description:** Version history for room snapshots.

**Behavior:**
- New version created when room becomes empty
- Versions queryable by owner
- Last 20 versions returned

---

### 4.10 Guest Access Module (FR-GUEST)

#### FR-GUEST-01: Guest Authentication
**Description:** Anonymous users can participate without registration.

**Guest Identification:**
- Client generates unique guest ID
- Client provides guest username
- Server stores guest in-memory only (not in database)

**Socket Auth:**
```javascript
auth: {
  guest: {
    id: "guest-uuid",
    username: "Guest123",
    isGuest: true
  }
}
```

**HTTP Headers:**
```
X-Guest-Id: guest-uuid
X-Guest-Username: Guest123
```

---

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements (NFR-PERF)

| Requirement | Target |
|-------------|--------|
| API response time | < 200ms (95th percentile) |
| WebSocket latency | < 100ms (local network) |
| Concurrent users per room | 50 (configurable) |
| Max strokes per room | 10,000 |
| Canvas rendering | 60 FPS |
| Cursor update rate | 30 FPS |
| Drawing emit throttle | 50ms |

### 5.2 Scalability Requirements (NFR-SCALE)

| Requirement | Target |
|-------------|--------|
| Concurrent rooms | 1,000+ |
| Total registered users | 100,000+ |
| Socket.IO sticky sessions | Supported |

### 5.3 Reliability Requirements (NFR-REL)

| Requirement | Target |
|-------------|--------|
| Uptime | 99.9% |
| Data durability | Auto-save within 30 seconds |
| Reconnection | Automatic with exponential backoff |
| Max reconnection delay | 5 seconds |

### 5.4 Security Requirements (NFR-SEC)

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | bcrypt (12 rounds) |
| Token format | JWT with expiration |
| Token TTL | 7 days (configurable) |
| HTTPS | Required in production |
| XSS prevention | Input sanitization |
| Rate limiting | Applied to auth endpoints |

### 5.5 Usability Requirements (NFR-USE)

| Requirement | Description |
|-------------|-------------|
| Responsive design | Mobile and desktop support |
| Keyboard shortcuts | Drawing tool switching |
| Error feedback | Toast notifications |
| Loading states | Visual indicators |

---

## 6. Data Models

### 6.1 User Model

```javascript
{
  _id: ObjectId,
  username: { type: String, required: true, unique: true, min: 3, max: 30 },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true, min: 6, select: false },
  avatar: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  verified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationTokenExpiresAt: Date,
  resetPasswordToken: String,
  resetPasswordTokenExpiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.2 Room Model

```javascript
{
  _id: ObjectId,
  name: { type: String, required: true, max: 100 },
  code: { type: String, unique: true, default: generateRoomCode },
  owner: { type: ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  maxParticipants: { type: Number, default: 10, min: 2, max: 50 },
  isActive: { type: Boolean, default: true },
  canvasSettings: {
    width: { type: Number, default: 1920 },
    height: { type: Number, default: 1080 },
    backgroundColor: { type: String, default: '#ffffff' }
  },
  createdAt: Date,
  lastActiveAt: Date,
  updatedAt: Date
}
```

### 6.3 SketchHistory Model

```javascript
{
  _id: ObjectId,
  room: { type: ObjectId, ref: 'Room', required: true, index: true },
  version: { type: Number, required: true },
  strokes: { type: Mixed, default: [] },  // Array of Stroke objects
  snapshot: { type: String, default: null },  // Base64 image
  createdBy: String,
  createdAt: Date
}
```

### 6.4 SessionParticipant Model

```javascript
{
  _id: ObjectId,
  room: { type: ObjectId, ref: 'Room', required: true },
  user: { type: ObjectId, ref: 'User', required: true },
  socketId: { type: String, required: true },
  role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  cursor: { x: Number, y: Number, visible: Boolean },
  color: { type: String, default: randomColor },
  isActive: { type: Boolean, default: true },
  joinedAt: Date,
  lastActiveAt: Date
}
// Indexes: { room: 1, user: 1 } unique, { socketId: 1 }
```

### 6.5 OTP Model

```javascript
{
  _id: ObjectId,
  email: { type: String, required: true, lowercase: true, index: true },
  code: { type: String, required: true },
  purpose: { 
    type: String, 
    enum: ['email_verification', 'password_reset', 'two_factor', 'login_verification'],
    default: 'email_verification'
  },
  attempts: { type: Number, default: 0, max: 5 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  verified: { type: Boolean, default: false },
  createdAt: Date
}
// Indexes: { email: 1, purpose: 1 }
```

---

## 7. API Specification

### 7.1 Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login user |
| GET | `/api/auth/verify-email` | Public | Verify email token |
| POST | `/api/auth/resend-verification` | Public | Resend verification email |
| GET | `/api/auth/check-availability` | Public | Check username/email |
| GET | `/api/auth/me` | Bearer | Get current user |
| PUT | `/api/auth/profile` | Bearer | Update profile |
| POST | `/api/auth/forgot-password` | Public | Request password reset |
| POST | `/api/auth/reset-password` | Public | Reset password with token |
| POST | `/api/auth/change-password` | Bearer | Change password |
| POST | `/api/auth/send-otp` | Public | Send OTP |
| POST | `/api/auth/verify-otp` | Public | Verify OTP |
| POST | `/api/auth/resend-otp` | Public | Resend OTP |

### 7.2 Room Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/rooms` | Bearer | Create room |
| GET | `/api/rooms` | Bearer | Get user's rooms |
| GET | `/api/rooms/public` | Public | Get public rooms |
| GET | `/api/rooms/:code` | Optional | Get room by code |
| POST | `/api/rooms/:code/join` | Optional | Join room |
| PATCH | `/api/rooms/:code` | Bearer (Owner) | Update room |
| GET | `/api/rooms/:code/history` | Bearer (Owner) | Get history |
| DELETE | `/api/rooms/:code` | Bearer (Owner) | Delete room |

### 7.3 Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users/stats` | Admin | User statistics |
| GET | `/api/admin/users` | Admin | List users |
| DELETE | `/api/admin/users/:userId` | Admin | Delete user |
| GET | `/api/admin/rooms/stats` | Admin | Room statistics |
| GET | `/api/admin/rooms` | Admin | List rooms |
| DELETE | `/api/admin/rooms/:roomId` | Admin | Delete room |

### 7.4 Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description"
}
```

### 7.5 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## 8. Socket.IO Events Specification

### 8.1 Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `room:join` | `{ roomCode: string }` | Join a room |
| `room:restore` | `{ version: number }` | Restore snapshot (owner) |
| `draw:stroke` | `{ stroke: Stroke, isPreview: boolean }` | Send stroke data |
| `draw:complete` | `{ strokeId: string }` | Finish drawing stroke |
| `draw:erase` | `{ strokeId: string }` | Delete a stroke |
| `draw:update` | `{ stroke: Stroke, isPreview: boolean }` | Update existing stroke |
| `draw:clear` | - | Clear all strokes |
| `draw:undo` | - | Undo last stroke |
| `draw:redo` | - | Redo last undone |
| `draw:reorder` | `{ strokeIds: string[] }` | Change z-order |
| `cursor:move` | `{ x: number, y: number, tool: string }` | Update cursor |
| `user:kick` | `{ targetUserId: string }` | Kick user (owner) |
| `chat:send` | `{ roomCode: string, message: string }` | Send chat message |

### 8.2 Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `room:state` | `{ strokes: Stroke[], participants: [] }` | Initial room state |
| `room:restored` | `{ strokes: Stroke[], version: number }` | Snapshot restored |
| `draw:stroke` | `{ stroke: Stroke, username: string, isPreview: boolean }` | Stroke from other user |
| `draw:complete` | `{ strokeId: string }` | Stroke completed |
| `draw:erase` | `{ strokeId: string }` | Stroke deleted |
| `draw:update` | `{ stroke: Stroke }` | Stroke updated |
| `draw:clear` | - | Canvas cleared |
| `draw:reorder` | `{ strokeIds: string[] }` | Z-order changed |
| `cursor:move` | `{ userId, x, y, tool }` | Cursor position |
| `user:joined` | `{ id, username, avatar, color, isGuest }` | User joined |
| `user:left` | `{ id, username, isGuest }` | User left |
| `user:kicked` | - | You were kicked |
| `chat:message` | `{ message, user, timestamp }` | Chat message |
| `save:error` | `{ message, roomCode, timestamp }` | Auto-save failed |
| `error` | `{ message: string }` | Error notification |
| `dashboard:roomUpdate` | `{ roomCode, participantCount }` | Room count changed |

### 8.3 Socket Authentication

**Registered User:**
```javascript
auth: { token: "JWT_TOKEN" }
```

**Guest:**
```javascript
auth: {
  guest: {
    id: "uuid",
    username: "Guest Name",
    isGuest: true
  }
}
```

---

## 9. Security Requirements

### 9.1 Authentication Security

| Aspect | Implementation |
|--------|----------------|
| Password Storage | bcrypt with 12 salt rounds |
| Password Minimum | 6 characters |
| JWT Secret | Environment variable |
| JWT Expiry | 7 days default |
| Token Refresh | Not implemented (re-login required) |

### 9.2 Authorization

| Resource | Authorization |
|----------|---------------|
| Protected routes | `protect` middleware (JWT verification) |
| Optional routes | `optionalAuth` middleware |
| Admin routes | `protect` + `adminOnly` middleware |
| Room owner actions | Owner ID check in service layer |

### 9.3 Input Validation

| Type | Validation |
|------|------------|
| Email | Regex validation |
| Username | 3-30 chars, case-insensitive unique |
| Phone | Regex for international format |
| Stroke data | Tool type, bounds, size limits |
| Chat messages | Length limit, XSS sanitization |

### 9.4 Rate Limiting

| Endpoint Group | Limit |
|----------------|-------|
| Auth endpoints | `authLimiter` |
| Sensitive auth (OTP, password) | `strictAuthLimiter` |
| OTP requests | 1 per 60 seconds per email |

---

## 10. Test Coverage Matrix

### 10.1 Unit Test Coverage

| Service | Test File | Test Cases |
|---------|-----------|------------|
| AuthService | `auth.service.test.js` | register, login, verifyEmail, getProfile, updateProfile, checkAvailability |
| RoomService | `room.service.test.js` | createRoom, getRoomsByOwner, joinRoom, updateRoom, deleteRoom, getRoomHistory |
| PasswordService | `password.service.test.js` | requestReset, resetPassword, changePassword |
| OTPService | `otp.service.test.js` | sendOTP, verifyOTP, getOTPStatus |
| AdminService | `admin.service.test.js` | getUserStats, getUsers, deleteUser, getRoomStats, getRooms, deleteRoom |

### 10.2 Integration Test Coverage

| Module | Test File | Endpoints Tested |
|--------|-----------|------------------|
| Auth API | `auth.api.test.js` | register, login, check-availability, me, profile |

### 10.3 Recommended Additional Tests

| Type | Coverage Area |
|------|---------------|
| Socket.IO Unit | Drawing handlers, room handlers |
| Socket.IO Integration | Real-time sync, multiple clients |
| E2E | Complete user journeys |
| Load | Concurrent users, message throughput |

---

## 11. Appendix

### 11.1 Configuration Constants

```javascript
{
  APP_NAME: 'CoPad',
  
  TOKEN_EXPIRY: {
    JWT: '7d',
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,  // 24 hours
    PASSWORD_RESET: 15,                         // 15 minutes
    OTP: 15                                     // 15 minutes
  },
  
  VALIDATION: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    PASSWORD_MIN_LENGTH: 6,
    OTP_LENGTH: 6,
    MAX_OTP_ATTEMPTS: 5
  },
  
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },
  
  ROOM: {
    MIN_PARTICIPANTS: 2,
    MAX_PARTICIPANTS: 50,
    DEFAULT_MAX_PARTICIPANTS: 10
  },
  
  RATE_LIMIT: {
    OTP_COOLDOWN_MS: 60000
  },
  
  CANVAS: {
    DEFAULT_WIDTH: 1920,
    DEFAULT_HEIGHT: 1080,
    CLIENT_WIDTH: 1600,
    CLIENT_HEIGHT: 900,
    MIN_ZOOM: 0.25,
    MAX_ZOOM: 4
  },
  
  SOCKET: {
    EMIT_THROTTLE: 50,
    CURSOR_THROTTLE: 33,
    AUTOSAVE_DELAY: 5000,
    MAX_AUTOSAVE_DELAY: 30000
  }
}
```

### 11.2 Error Classes

| Error Class | HTTP Status | Usage |
|-------------|-------------|-------|
| `NotFoundError` | 404 | Resource not found |
| `BadRequestError` | 400 | Invalid input |
| `UnauthorizedError` | 401 | Authentication failed |
| `ForbiddenError` | 403 | Permission denied |
| `ConflictError` | 409 | Duplicate resource |
| `TokenExpiredError` | 410 | Token expired |
| `RateLimitError` | 429 | Rate limit exceeded |
| `EmailVerificationRequiredError` | 403 | Email not verified |

### 11.3 Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/copad

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Client
CLIENT_URL=http://localhost:3000

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password

# OTP
OTP_LENGTH=6
OTP_TTL_MINUTES=15
RESET_TTL_MINUTES=15
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-15 | Generated from Code | Initial specification derived from codebase analysis |

---

*This document was generated by analyzing the CoPad codebase. All specifications reflect the actual implementation as of the document date.*
