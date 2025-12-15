# Testing Strategy - Advanced Sketch

**Generated**: December 15, 2025

## Architecture Overview

### Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand
- **Backend**: Node.js, Express 4.18, Socket.io 4.6
- **Database**: MongoDB (Mongoose 8.0)
- **Real-time**: WebSocket (Socket.io)
- **Auth**: JWT, bcryptjs

### Project Structure
```
advanced-sketch/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Canvas, UI components
│   │   ├── pages/       # Auth, Room, Dashboard, Admin
│   │   ├── hooks/       # useCanvas, usePolling, etc.
│   │   ├── services/    # API, Socket clients
│   │   └── store/       # Zustand stores
│   └── e2e/            # Playwright E2E tests (to be created)
│
└── server/             # Node.js backend
    ├── src/
    │   ├── controllers/ # HTTP request handlers
    │   ├── services/    # Business logic (auth, room, admin, password, otp)
    │   ├── models/      # Mongoose models (User, Room, SketchHistory, SessionParticipant, OTP)
    │   ├── socket/      # Socket.io handlers (drawing, room, chat)
    │   ├── middleware/  # Auth, rate limiting, error handling
    │   ├── routes/      # Express routes
    │   ├── utils/       # Custom errors, crypto, JWT, response helpers
    │   └── libs/        # Email templates, mailer, logger
    └── __tests__/      # Jest tests (to be created)
```

---

## Testing Pyramid

```
        /\
       /  \  E2E Tests (10%)
      /____\  - Playwright
     /      \  Integration Tests (30%)
    /________\  - Socket.io + Supertest
   /          \  Unit Tests (60%)
  /____________\  - Jest + MongoDB Memory Server
```

---

## 1. Backend Unit Tests (Jest + MongoDB Memory Server)

### Test Coverage Targets

#### **Auth Service** (`auth.service.js`)
| Function | Test Cases |
|----------|------------|
| `register()` | ✅ Success with valid data<br>❌ Duplicate email<br>❌ Duplicate username<br>❌ Invalid email format<br>✅ Email verification token generated |
| `login()` | ✅ Success with email<br>✅ Success with username<br>❌ Wrong password<br>❌ Email not verified<br>❌ User not found |
| `verifyEmail()` | ✅ Valid token<br>❌ Expired token<br>❌ Invalid token<br>❌ User already verified |
| `checkAvailability()` | ✅ Username available<br>❌ Username taken<br>✅ Email available<br>❌ Email taken (case-insensitive) |

#### **Room Service** (`room.service.js`)
| Function | Test Cases |
|----------|------------|
| `createRoom()` | ✅ Public room<br>✅ Private room<br>❌ Invalid max participants<br>✅ Generate unique code |
| `joinRoom()` | ✅ Join public room<br>✅ Join private room with password<br>❌ Room full<br>❌ Wrong password |
| `updateRoom()` | ✅ Owner updates settings<br>❌ Non-owner attempts update |
| `deleteRoom()` | ✅ Owner deletes<br>❌ Non-owner attempts delete<br>✅ Cascade cleanup (SessionParticipant, SketchHistory) |

#### **Password Service** (`password.service.js`)
| Function | Test Cases |
|----------|------------|
| `requestReset()` | ✅ Valid email/username<br>❌ User not found<br>✅ Reset token generated |
| `resetPassword()` | ✅ Valid token<br>❌ Expired token<br>❌ Invalid token<br>✅ Password updated |
| `changePassword()` | ✅ Correct current password<br>❌ Wrong current password |

#### **OTP Service** (`otp.service.js`)
| Function | Test Cases |
|----------|------------|
| `sendOTP()` | ✅ Generate 6-digit OTP<br>✅ 15min expiry<br>❌ Rate limit (60s cooldown) |
| `verifyOTP()` | ✅ Correct OTP<br>❌ Wrong OTP<br>❌ Expired OTP<br>❌ Max attempts exceeded (5) |

#### **Admin Service** (`admin.service.js`)
| Function | Test Cases |
|----------|------------|
| `getUserStats()` | ✅ Count total, guests, registered |
| `getUsers()` | ✅ Pagination works<br>✅ Search by email/username |
| `deleteUser()` | ✅ Cascade delete rooms<br>❌ Cannot delete self |

---

## 2. Backend Integration Tests (Supertest + Socket.io Client)

### API Endpoint Tests

#### **Auth Routes** (`/api/auth`)
```javascript
POST /api/auth/register
  ✅ Returns 201 with token
  ❌ Returns 409 on duplicate email
  ✅ Sends verification email

POST /api/auth/login
  ✅ Returns 200 with token
  ❌ Returns 401 on email not verified
  ❌ Returns 401 on wrong password

GET /api/auth/verify-email?uid=X&token=Y
  ✅ Returns 200 and marks verified
  ❌ Returns 400 on invalid token

POST /api/auth/check-availability?email=X
  ✅ Returns available: true/false
  ✅ Case-insensitive check
```

#### **Room Routes** (`/api/rooms`)
```javascript
POST /api/rooms
  ✅ Returns 201 with room code
  ❌ Returns 401 if not authenticated

GET /api/rooms
  ✅ Returns user's owned rooms
  ✅ Empty array if no rooms

GET /api/rooms/:code
  ✅ Returns room details
  ❌ Returns 404 if not found

DELETE /api/rooms/:code
  ✅ Returns 200 if owner
  ❌ Returns 403 if not owner
```

### Socket.io Event Tests

#### **Drawing Events**
```javascript
'draw:stroke' event
  ✅ Broadcast to other users in room
  ✅ Add stroke to roomState.strokesMap
  ✅ Generate unique sequence number
  ❌ Reject if not in room
  ❌ Reject invalid tool type

'draw:complete' event
  ✅ Mark stroke as finalized
  ✅ Broadcast to room

'draw:erase' event
  ✅ Remove stroke from state
  ✅ Broadcast to room

'draw:clear' event
  ✅ Clear all strokes
  ✅ Broadcast to room
  ✅ Owner-only permission check

'draw:update' (transform)
  ✅ Update stroke in state
  ✅ Broadcast preview with isPreview: true
  ✅ Finalize with isPreview: false
```

#### **Room Events**
```javascript
'room:join' event
  ✅ Socket joins room
  ✅ Receive 'room:state' with strokes
  ✅ Broadcast 'user:joined' to others
  ✅ Create SessionParticipant record
  ✅ Emit 'dashboard:roomUpdate'
  ❌ Reject if room not found

'user:kick' event
  ✅ Owner can kick user
  ✅ Target receives 'user:kicked'
  ✅ Target disconnected from room
  ❌ Non-owner cannot kick

'chat:message' event
  ✅ Broadcast to all in room
  ✅ Trim whitespace
  ❌ Reject if > 500 chars
```

#### **Cursor Events**
```javascript
'cursor:move' event
  ✅ Broadcast x, y, tool, userId
  ✅ Throttled (should not emit more than once per 33ms per client)
```

---

## 3. Concurrent Drawing Race Condition Tests

**Critical**: Test the fixes documented in `CONCURRENT_DRAWING_FIXES.md`

### Test Scenarios
```javascript
describe('Concurrent Drawing', () => {
  test('Multiple users drawing simultaneously', async () => {
    // Connect 5 clients
    const clients = await connectMultipleClients(5);
    
    // All draw at same time (t=0ms)
    const promises = clients.map((client, i) => 
      client.emit('draw:stroke', { 
        id: `stroke-${i}`, 
        tool: 'pen', 
        points: [[10*i, 10*i]] 
      })
    );
    
    await Promise.all(promises);
    
    // Verify all 5 strokes in state
    const state = getRoomState(roomCode);
    expect(state.strokesMap.size).toBe(5);
    
    // Verify unique sequence numbers
    const sequences = Array.from(state.strokesMap.values()).map(s => s.sequence);
    expect(new Set(sequences).size).toBe(5);
  });
  
  test('No duplicate strokes on concurrent updates', async () => {
    const client1 = await connectClient();
    const client2 = await connectClient();
    
    // Client1 draws stroke
    client1.emit('draw:stroke', { id: 'stroke-1', tool: 'pen', points: [[0,0]] });
    
    // Both update same stroke simultaneously
    await Promise.all([
      client1.emit('draw:update', { id: 'stroke-1', rotation: 45 }),
      client2.emit('draw:update', { id: 'stroke-1', rotation: 90 })
    ]);
    
    const state = getRoomState(roomCode);
    expect(state.strokesMap.size).toBe(1);
  });
  
  test('Sequence numbers prevent out-of-order rendering', async () => {
    // Emit strokes with artificial delays
    // Verify client receives them in sequence order
  });
});
```

---

## 4. E2E Tests (Playwright)

### Critical User Flows

#### **Authentication Flow**
```javascript
test('User can register and verify email', async ({ page }) => {
  await page.goto('/auth/signup');
  await page.fill('[name=username]', 'testuser');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password123');
  await page.click('button[type=submit]');
  
  // Should show verification prompt
  await expect(page.locator('text=Verify your email')).toBeVisible();
  
  // Mock email click (or use Mailhog/Mailtrap)
  const verifyLink = await getVerificationLink('test@example.com');
  await page.goto(verifyLink);
  
  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

#### **Room Creation & Join**
```javascript
test('User can create and join room', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // User 1 creates room
  await page1.goto('/dashboard');
  await page1.click('text=Create Room');
  await page1.fill('[name=roomName]', 'Test Room');
  await page1.click('button:has-text("Create")');
  
  const roomCode = await page1.locator('[data-testid=room-code]').textContent();
  
  // User 2 joins room
  await page2.goto('/dashboard');
  await page2.click('text=Join Room');
  await page2.fill('[name=code]', roomCode);
  await page2.click('button:has-text("Join")');
  
  // Both should be in room
  await expect(page1.locator('text=Test Room')).toBeVisible();
  await expect(page2.locator('text=Test Room')).toBeVisible();
  
  // Verify participant count
  await expect(page1.locator('[data-testid=participant-count]')).toHaveText('2');
});
```

#### **Real-time Drawing**
```javascript
test('Multiple users can draw simultaneously', async ({ browser }) => {
  const [page1, page2] = await setupTwoUsersInRoom(browser);
  
  // User 1 selects pen and draws
  await page1.click('[data-tool=pen]');
  await page1.mouse.move(100, 100);
  await page1.mouse.down();
  await page1.mouse.move(200, 200);
  await page1.mouse.up();
  
  // User 2 should see the stroke
  await page2.waitForSelector('canvas');
  const canvas2Data = await page2.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas.toDataURL();
  });
  
  expect(canvas2Data).not.toBe(blankCanvasData);
  
  // User 2 draws while User 1 draws
  await page2.click('[data-tool=pen]');
  await Promise.all([
    drawStroke(page1, [[50,50], [100,100]]),
    drawStroke(page2, [[150,150], [200,200]])
  ]);
  
  // Verify both strokes exist (no race condition)
  const strokeCount1 = await getStrokeCount(page1);
  const strokeCount2 = await getStrokeCount(page2);
  
  expect(strokeCount1).toBe(3); // Initial + 2 new strokes
  expect(strokeCount2).toBe(3);
});
```

#### **Transform Operations**
```javascript
test('User can resize and rotate shapes', async ({ page }) => {
  await page.goto('/room/TESTCODE');
  
  // Draw rectangle
  await page.click('[data-tool=rectangle]');
  await page.mouse.move(100, 100);
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  // Select tool
  await page.click('[data-tool=select]');
  await page.click('canvas', { position: { x: 150, y: 150 } });
  
  // Should show selection handles
  await expect(page.locator('[data-testid=resize-handle-se]')).toBeVisible();
  
  // Resize by dragging corner
  const handle = page.locator('[data-testid=resize-handle-se]');
  await handle.dragTo(page.locator('canvas'), { targetPosition: { x: 300, y: 300 } });
  
  // Rotate by dragging rotation handle
  const rotateHandle = page.locator('[data-testid=rotate-handle]');
  await rotateHandle.dragTo(page.locator('canvas'), { targetPosition: { x: 150, y: 50 } });
  
  // Verify shape transformed
  const bounds = await getShapeBounds(page);
  expect(bounds.width).toBeGreaterThan(100);
  expect(bounds.rotation).toBeGreaterThan(0);
});
```

#### **Cursor Tracking During Transform**
```javascript
test('Cursor moves in real-time during resize/rotate/drag', async ({ browser }) => {
  const [page1, page2] = await setupTwoUsersInRoom(browser);
  
  // User 1 draws and selects rectangle
  await drawRectangle(page1, { x: 100, y: 100, width: 100, height: 100 });
  await selectShape(page1, { x: 150, y: 150 });
  
  // User 2 should see User 1's cursor
  await expect(page2.locator('[data-cursor-user="user1"]')).toBeVisible();
  
  // User 1 drags shape
  const dragPromise = page1.mouse.move(100, 100).then(() => 
    page1.mouse.down()
  ).then(() =>
    page1.mouse.move(200, 200, { steps: 10 })
  );
  
  // User 2 should see cursor moving during drag
  await page2.waitForFunction(() => {
    const cursor = document.querySelector('[data-cursor-user="user1"]');
    const x = parseFloat(cursor.style.left);
    return x > 150; // Cursor moved from 100 to 200
  });
  
  await dragPromise;
  await page1.mouse.up();
  
  // Verify final cursor position
  const finalCursor = await page2.locator('[data-cursor-user="user1"]').boundingBox();
  expect(finalCursor.x).toBeCloseTo(200, 10);
});
```

---

## 5. Load Testing (Artillery)

### Socket.io Stress Test

**File**: `server/__tests__/load/concurrent-drawing.yml`

```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warm up
    - duration: 120
      arrivalRate: 20
      name: Ramp up load
    - duration: 180
      arrivalRate: 50
      name: Sustained load
  socketio:
    transports: ['websocket']
  processor: './load-test-helpers.js'

scenarios:
  - name: Concurrent Drawing Session
    engine: socketio
    flow:
      - emit:
          channel: 'room:join'
          data:
            roomCode: 'LOADTEST'
            userId: '{{ $randomString() }}'
            username: 'User{{ $randomNumber(1, 1000) }}'
      
      - think: 1
      
      - loop:
          - emit:
              channel: 'draw:stroke'
              data:
                id: '{{ $randomString() }}'
                tool: 'pen'
                points: '{{ generateRandomPoints() }}'
                color: '#000000'
                strokeWidth: 2
          
          - emit:
              channel: 'cursor:move'
              data:
                x: '{{ $randomNumber(0, 1600) }}'
                y: '{{ $randomNumber(0, 900) }}'
                tool: 'pen'
          
          - think: 0.1
        count: 100
```

### Metrics to Track
- **Latency**: p95, p99 for `draw:stroke` events
- **Throughput**: Strokes/second
- **Memory**: Server memory usage over time
- **Errors**: Socket disconnections, emit failures
- **Concurrency**: Max simultaneous users before degradation

---

## 6. Test Infrastructure Setup

### Install Dependencies

```bash
# Backend testing
cd server
npm install --save-dev jest supertest socket.io-client mongodb-memory-server

# E2E testing
cd client
npm install --save-dev @playwright/test

# Load testing
npm install -g artillery artillery-plugin-expect
```

### Jest Configuration

**File**: `server/jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

**File**: `server/jest.setup.js`

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});
```

### Playwright Configuration

**File**: `client/playwright.config.js`

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: [
    {
      command: 'cd ../server && npm start',
      port: 5000,
      timeout: 120000
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
```

---

## 7. CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd server && npm ci
      
      - name: Run unit tests
        run: cd server && npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage/lcov.info
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Playwright
        run: cd client && npx playwright install --with-deps
      
      - name: Run E2E tests
        run: cd client && npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: client/playwright-report/
```

---

## 8. Test Execution Plan

### Phase 1: Backend Unit Tests (Week 1)
1. ✅ Setup Jest + MongoDB Memory Server
2. ✅ Write Auth Service tests (register, login, verify)
3. ✅ Write Room Service tests (CRUD, permissions)
4. ✅ Write Password/OTP Service tests

### Phase 2: Backend Integration Tests (Week 2)
1. ✅ Setup Supertest
2. ✅ Test all API routes
3. ✅ Setup Socket.io client mocks
4. ✅ Test Socket events (draw, room, cursor, chat)

### Phase 3: Concurrent Drawing Tests (Week 3)
1. ✅ Test multi-client drawing scenarios
2. ✅ Verify sequence number ordering
3. ✅ Test race condition fixes from CONCURRENT_DRAWING_FIXES.md

### Phase 4: E2E Tests (Week 4)
1. ✅ Setup Playwright
2. ✅ Write auth flow tests
3. ✅ Write room creation/join tests
4. ✅ Write drawing & transform tests
5. ✅ Write cursor tracking tests

### Phase 5: Load Testing (Week 5)
1. ✅ Setup Artillery
2. ✅ Write load test scenarios
3. ✅ Benchmark current performance
4. ✅ Identify bottlenecks

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Unit Test Coverage | ≥70% |
| Integration Test Coverage | ≥60% |
| E2E Critical Paths | 100% |
| Load Test Users | 100 concurrent |
| Load Test Latency (p95) | <100ms |
| CI/CD Pass Rate | ≥95% |

---

## Next Steps

1. ✅ Review and approve this strategy
2. ⏳ Begin Phase 1: Backend unit tests
3. ⏳ Setup CI/CD pipeline
4. ⏳ Integrate test coverage reporting
