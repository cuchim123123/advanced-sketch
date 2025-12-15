# Software Requirements Specification (SRS)
## Collaborative Sketch - Real-time Whiteboard Application

**Document Standard:** IEEE 830-1998  
**Version:** 2.0  
**Date:** December 15, 2025  
**Status:** Approved  
**Project:** Collaborative Sketch  
**Classification:** Internal Use

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | 2024-12-15 | Dev Team | Initial specification derived from codebase |
| 2.0 | 2025-12-15 | Dev Team | Updated to IEEE 830 standard, validated against implementation |

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 [Purpose](#11-purpose)
   - 1.2 [Document Conventions](#12-document-conventions)
   - 1.3 [Intended Audience](#13-intended-audience)
   - 1.4 [Product Scope](#14-product-scope)
   - 1.5 [References](#15-references)
2. [Overall Description](#2-overall-description)
   - 2.1 [Product Perspective](#21-product-perspective)
   - 2.2 [Product Functions](#22-product-functions)
   - 2.3 [User Classes and Characteristics](#23-user-classes-and-characteristics)
   - 2.4 [Operating Environment](#24-operating-environment)
   - 2.5 [Design and Implementation Constraints](#25-design-and-implementation-constraints)
   - 2.6 [Assumptions and Dependencies](#26-assumptions-and-dependencies)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Other Requirements](#6-other-requirements)
7. [Appendix](#7-appendix)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document provides a complete description of the requirements for the **Collaborative Sketch** platform. It defines the functional and non-functional requirements, system interfaces, and constraints for developers, testers, project managers, and stakeholders.

This document is intended to:
- Establish the basis for agreement between stakeholders and developers
- Provide a reference for validation and verification
- Facilitate knowledge transfer and maintenance
- Serve as the authoritative source for all development and testing activities

### 1.2 Document Conventions

**Requirement Prioritization:**
- **SHALL/MUST** - Mandatory requirement
- **SHOULD** - Recommended requirement  
- **MAY** - Optional requirement

**Naming Conventions:**
- `FR-XXX-NN` - Functional Requirement (e.g., FR-AUTH-01)
- `NFR-XXX-NN` - Non-Functional Requirement (e.g., NFR-PERF-01)
- `UC-NN` - Use Case identifier

**Typographic Conventions:**
- `Code` - Code snippets, API endpoints, data types
- **Bold** - Important terms, emphasis
- *Italic* - External references, document titles

### 1.3 Intended Audience

This document is intended for:

| Audience | Relevant Sections |
|----------|-------------------|
| **Developers** | All sections, especially §3, §4, §7 |
| **Testers** | §3, §5, §6 for test case derivation |
| **Project Managers** | §1, §2, §5 for scope and timeline planning |
| **System Administrators** | §4, §5, §7 for deployment and operations |
| **End Users** | §2.2, §3 for feature understanding |
| **Stakeholders** | §1, §2 for business requirements |

### 1.4 Product Scope

**Collaborative Sketch** is a web-based real-time collaborative whiteboard application that enables multiple users to draw, sketch, and communicate simultaneously on a shared canvas.

**Primary Objectives:**
- Enable real-time collaboration for remote teams, educators, and creative professionals
- Provide an intuitive drawing interface with professional-grade tools
- Support both registered users and anonymous guests
- Ensure data persistence and version control for collaborative work

**Benefits:**
- Zero-latency drawing synchronization across participants
- No software installation required (browser-based)
- Secure authentication with email verification
- Scalable architecture supporting multiple concurrent rooms

**Goals:**
- Reduce communication barriers in remote collaboration
- Provide a lightweight alternative to desktop drawing applications
- Enable visual brainstorming and teaching

### 1.5 References

1. IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*
2. RFC 7519, *JSON Web Token (JWT)*
3. RFC 6455, *The WebSocket Protocol*
4. Socket.IO Documentation, https://socket.io/docs/
5. React Documentation, https://react.dev/
6. MongoDB Documentation, https://docs.mongodb.com/

---

## 2. Overall Description

### 2.1 Product Perspective

Collaborative Sketch is a standalone web application consisting of three main subsystems:

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATION                        │
│  ┌────────────┬────────────┬─────────────┬──────────────┐    │
│  │   Canvas   │  Socket    │   Global    │      UI      │    │
│  │ Components │  Service   │ State Store │  Components  │    │
│  │            │            │  (Zustand)  │              │    │
│  └────────────┴────────────┴─────────────┴──────────────┘    │
└────────────────────────────┬─────────────────────────────────┘
                             │
              HTTPS (REST API) / WSS (WebSocket)
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVER APPLICATION                        │
│   ┌─────────────────────────────────────────────────────┐    │
│   │ Express Routes │ Socket.IO Handlers │ Middleware    │    │
│   ├─────────────────────────────────────────────────────┤    │
│   │ Auth Service │ Room Service │ Drawing Service       │    │
│   └─────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                    DATA LAYER (MongoDB)                      │
│              Users │ Rooms │ SketchHistory                   │
│         (SessionParticipants – transient/in-memory)          │
└──────────────────────────────────────────────────────────────┘
```

**System Interfaces:**
- RESTful HTTP API for authentication and resource management
- WebSocket (Socket.IO) for real-time drawing and chat
- MongoDB for persistent data storage
- SMTP for email delivery

**User Interfaces:**
- Responsive web interface (desktop and mobile)
- Canvas-based drawing surface with tool palette
- Real-time chat sidebar
- Room management dashboard

**Hardware Interfaces:**
- Standard web browser with HTML5 Canvas support
- Mouse/trackpad/touchscreen for drawing input
- Network interface for HTTP/WebSocket communication

**Software Interfaces:**
- Node.js runtime (v18+)
- MongoDB database (v5.0+)
- Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

**Communications Interfaces:**
- HTTP/HTTPS (RESTful API)
- WebSocket (Socket.IO with polling fallback)
- SMTP (email delivery)

**Memory Constraints:**
- Client-side canvas rendering limited by browser memory
- Server-side room state capped at 10,000 strokes per room
- Individual stroke point limit: 10,000 points

**Operations:**
- Continuous operation (24/7 availability)
- Automatic reconnection on connection loss
- Graceful degradation on network issues

### 2.2 Product Functions

**High-Level Feature Summary:**

**High-Level Feature Summary:**

1. **User Management** (UC-01 to UC-05)
   - User registration with email verification
   - Secure authentication (login/logout)
   - Password management (reset, change)
   - Profile management
   - Guest access for anonymous users

2. **Room Management** (UC-06 to UC-10)
   - Create collaborative drawing rooms
   - Join rooms via unique 8-character code
   - Configure room settings (public/private, participant limit)
   - Delete owned rooms
   - View room history and snapshots

3. **Real-time Drawing** (UC-11 to UC-15)
   - Multiple drawing tools (pen, shapes, text, images)
   - Live drawing preview and synchronization
   - Undo/redo functionality
   - Stroke manipulation (reorder, delete)
   - Canvas export (PNG, SVG, PDF)

4. **Collaboration Features** (UC-16 to UC-18)
   - Real-time cursor tracking
   - In-room text chat
   - Participant presence indicators
   - Color-coded user identification

5. **Administrative Functions** (UC-19 to UC-21)
   - User management and statistics
   - Room management and monitoring
   - System health monitoring

### 2.3 User Classes and Characteristics

The system SHALL support four distinct user roles with hierarchical permissions:

#### 2.3.1 Guest User

**Characteristics:**
- Anonymous, unregistered users
- No persistent identity across sessions
- Limited administrative capabilities
- Temporary session-based access

**Technical Sophistication:** Basic (no technical knowledge required)

**Permissions:**
- ✓ Join rooms via code/link
- ✓ Draw and use all drawing tools
- ✓ Send chat messages
- ✓ View other participants
- ✗ Create rooms
- ✗ Clear canvas
- ✗ Access room settings
- ✗ View room history

**Frequency of Use:** Occasional (one-time or sporadic collaboration)

#### 2.3.2 Registered User

**Characteristics:**
- Verified email address
- Persistent account with saved rooms
- Full drawing and room creation capabilities

**Technical Sophistication:** Basic to Intermediate

**Permissions:**
- ✓ All Guest permissions
- ✓ Create unlimited rooms
- ✓ Clear canvas (in any room)
- ✓ Save and load sketches
- ✓ Manage owned rooms
- ✓ Access room history (as owner)
- ✗ Manage other users
- ✗ Access admin dashboard

**Frequency of Use:** Regular (daily to weekly collaboration)

#### 2.3.3 Room Owner

**Characteristics:**
- User who created a specific room
- Full control over room settings and participants
- Automatic role assignment on room creation

**Technical Sophistication:** Intermediate

**Permissions:**
- ✓ All Registered User permissions
- ✓ Update room settings (name, visibility, max participants)
- ✓ Kick participants from room
- ✓ Delete room and all associated data
- ✓ View complete room history
- ✓ Restore previous snapshots

**Frequency of Use:** Regular (managing collaborative sessions)

#### 2.3.4 Administrator

**Characteristics:**
- System administrator with elevated privileges
- Database flag: `role: "admin"`
- Platform-wide management capabilities

**Technical Sophistication:** Advanced (system administration knowledge)

**Permissions:**
- ✓ All Room Owner permissions (for all rooms)
- ✓ View system statistics
- ✓ Manage all users (list, delete)
- ✓ Manage all rooms (list, delete)
- ✓ Access admin dashboard
- ✗ Cannot delete own admin account

**Frequency of Use:** As needed (system maintenance and moderation)

### 2.4 Operating Environment

**Client-Side:**
- **Hardware:** Desktop, laptop, or tablet with 2GB+ RAM
- **Operating System:** Windows 10+, macOS 10.15+, Linux, iOS 14+, Android 10+
- **Web Browser:** 
  - Chrome/Chromium 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+
- **Network:** Stable internet connection (min 1 Mbps)
- **Screen Resolution:** Minimum 1024x768 recommended

**Server-Side:**
- **Hardware:** 2+ CPU cores, 4GB+ RAM, 20GB+ storage
- **Operating System:** Linux (Ubuntu 20.04+), Windows Server 2019+
- **Runtime:** Node.js v18+ LTS
- **Database:** MongoDB v5.0+ (standalone or Atlas)
- **Network:** HTTP/HTTPS ports (80/443), WebSocket support

**Production Environment:**
- Reverse proxy (Nginx/Apache) recommended
- SSL/TLS certificate required for HTTPS
- Process manager (PM2, systemd) for server reliability
- Database backup strategy implemented

### 2.5 Design and Implementation Constraints

**Technology Constraints:**
- MUST use JavaScript/TypeScript for all development
- MUST use React 18+ for frontend framework
- MUST use Express.js for backend server
- MUST use MongoDB for data persistence
- MUST use Socket.IO for WebSocket communication

**Security Constraints:**
- MUST hash passwords using bcrypt with minimum 12 rounds
- MUST implement JWT-based authentication
- MUST validate and sanitize all user inputs
- MUST use HTTPS in production environments
- MUST implement rate limiting on authentication endpoints

**Regulatory Constraints:**
- MUST comply with data privacy regulations (GDPR, CCPA)
- MUST provide user data export/deletion capabilities
- MUST secure personally identifiable information (PII)
- MUST maintain audit logs for administrative actions

**Performance Constraints:**
- SHALL support minimum 50 concurrent users per room
- SHALL handle minimum 1,000 concurrent rooms
- SHALL maintain <200ms API response time (95th percentile)
- SHALL support canvas with up to 10,000 strokes

**Browser Constraints:**
- MUST support HTML5 Canvas API
- MUST support WebSocket or polling fallback
- MUST function without third-party plugins

**Development Constraints:**
- Source code MUST be version-controlled (Git)
- MUST follow ESLint configuration for code style
- MUST achieve minimum 80% test coverage
- MUST document all public APIs

### 2.6 Assumptions and Dependencies

**Assumptions:**
1. Users have stable internet connectivity
2. Users' browsers support HTML5 Canvas
3. Users provide valid email addresses for registration
4. MongoDB database is properly configured and accessible
5. SMTP server is available for email delivery
6. System clock is synchronized (for JWT expiration)

**Dependencies:**

| Component | Dependency | Version | Purpose |
|-----------|------------|---------|---------|
| Frontend | React | 18.x | UI framework |
| Frontend | Vite | 5.x | Build tool |
| Frontend | TailwindCSS | 3.x | Styling |
| Frontend | Zustand | 4.x | State management |
| Frontend | Socket.IO Client | 4.x | WebSocket communication |
| Backend | Node.js | 18.x LTS | Runtime environment |
| Backend | Express | 4.x | HTTP server |
| Backend | Socket.IO | 4.x | WebSocket server |
| Backend | Mongoose | 8.x | MongoDB ODM |
| Backend | bcrypt | 5.x | Password hashing |
| Backend | jsonwebtoken | 9.x | JWT generation |
| Backend | Nodemailer | 6.x | Email delivery |
| Database | MongoDB | 5.0+ | Data persistence |

**External Service Dependencies:**
- SMTP server for transactional emails (verification, password reset)
- DNS service for domain resolution
- SSL certificate authority for HTTPS

---

## 3. System Features

### 3.1 User Authentication and Authorization

#### 3.1.1 Description and Priority

**Priority:** HIGH (Critical)  
**Risk:** HIGH (Security-sensitive)

User authentication provides secure access control and identity management. This feature enables users to create accounts, log in securely, verify email addresses, and manage credentials.

#### 3.1.2 Stimulus/Response Sequences

**Use Case UC-01: User Registration**

| Actor | System |
|-------|--------|
| 1. User navigates to registration page | |
| 2. User enters username, email, password | |
| | 3. System validates input format |
| | 4. System checks username/email uniqueness |
| | 5. System hashes password (bcrypt) |
| | 6. System creates user record |
| | 7. System generates verification token |
| | 8. System sends verification email |
| | 9. System returns JWT and user data |
| 10. User redirected to dashboard | |

**Use Case UC-02: Email Verification**

| Actor | System |
|-------|--------|
| 1. User clicks email verification link | |
| | 2. System extracts userId and token from URL |
| | 3. System validates token hash |
| | 4. System checks token expiration (24h TTL) |
| | 5. System sets isEmailVerified = true |
| 6. User sees success confirmation | |

**Use Case UC-03: User Login**

| Actor | System |
|-------|--------|
| 1. User enters email/username and password | |
| | 2. System locates user by email/username |
| | 3. System verifies password (bcrypt.compare) |
| | 4. System checks isEmailVerified === true |
| | 5. System generates new JWT token |
| 6. User redirected to dashboard | |

#### 3.1.3 Functional Requirements

**FR-AUTH-01: User Registration**

The system SHALL allow users to create an account with the following:

| Field | Type | Validation Rules |
|-------|------|------------------|
| username | String | Required, 3-30 characters, alphanumeric + underscore, unique (case-insensitive) |
| email | String | Required, valid email format (RFC 5322), unique, normalized to lowercase |
| password | String | Required, minimum 6 characters |

**Acceptance Criteria:**
- Username uniqueness check MUST be case-insensitive
- Email MUST be normalized (lowercased, trimmed)
- Password MUST be hashed with bcrypt (12 rounds minimum)
- New users MUST have `isEmailVerified = false`
- System MUST generate verification token with 24-hour expiration
- System MUST send verification email within 30 seconds
- System MUST return JWT token valid for 7 days
- System MUST return 409 Conflict for duplicate email/username

**FR-AUTH-02: Email Verification**

The system SHALL verify user email addresses through tokenized links.

**URL Format:** `GET /api/auth/verify-email?uid={userId}&token={plainToken}`

**Process:**
1. System SHALL validate user exists
2. System SHALL reject if email already verified (400)
3. System SHALL hash plain token and compare with stored hash
4. System SHALL check token expiration (<24h since creation)
5. System SHALL set `isEmailVerified = true` and clear token fields
6. System SHALL return 200 OK on success

**Error Responses:**
- 404 Not Found - User does not exist
- 400 Bad Request - Email already verified
- 400 Bad Request - Invalid token hash
- 410 Gone - Token expired

**FR-AUTH-03: User Login**

The system SHALL authenticate users via email/username/phone and password.

**Endpoint:** `POST /api/auth/login`

**Input:**
```json
{
  "emailOrPhoneOrUsername": "user@example.com",
  "password": "userPassword123"
}
```

**Process:**
1. System SHALL normalize input (lowercase email, trim username)
2. System SHALL query database using OR condition (email OR username OR phone)
3. System SHALL retrieve password hash (excluded by default in User model)
4. System SHALL verify password using bcrypt.compare()
5. System SHALL enforce email verification (`isEmailVerified` must be true)
6. System SHALL generate JWT token with 7-day expiration
7. System SHALL return user object (excluding password) and token

**Error Responses:**
- 401 Unauthorized - Invalid credentials (password mismatch or user not found)
- 403 Forbidden - Email verification required (`EmailVerificationRequiredError`)

**FR-AUTH-04: Password Reset Flow**

The system SHALL allow password reset via email verification.

**Step 1:** `POST /api/auth/forgot-password`
- Input: `{ "email": "user@example.com" }`
- System SHALL always return success (prevent user enumeration)
- System SHALL generate reset token with 15-minute expiration
- System SHALL send reset email with link

**Step 2:** `POST /api/auth/reset-password`
- Input: `{ "userId": "...", "token": "...", "newPassword": "..." }`
- System SHALL validate token hash and expiration
- System SHALL enforce minimum 6-character password
- System SHALL hash new password and update user
- System SHALL clear reset token fields

**FR-AUTH-05: Change Password (Authenticated)**

The system SHALL allow authenticated users to change their password.

**Endpoint:** `POST /api/auth/change-password`  
**Authorization:** Required (JWT)

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
