/**
 * API Contract Tests
 * 
 * These tests verify that API responses match the expected schema
 * that the client depends on. This prevents breaking changes.
 */

const request = require('supertest');
const app = require('../../app');
const { User, Room } = require('../../models');
const { createVerifiedUser, createTestRoom } = require('../helpers/testData');

// Helper to generate unique values
const uniqueEmail = () => `user${Date.now()}@test.com`;
const uniqueUsername = () => `user${Date.now()}`;
const uniqueCode = () => `T${Date.now().toString(36).toUpperCase()}`;

// =============================================================================
// SCHEMA VALIDATORS
// =============================================================================

/**
 * Standard API response wrapper
 */
const expectSuccessResponse = (body) => {
  expect(body).toHaveProperty('success', true);
  expect(body).toHaveProperty('data');
};

const expectErrorResponse = (body) => {
  expect(body).toHaveProperty('success', false);
  expect(body).toHaveProperty('message');
  expect(typeof body.message).toBe('string');
};

/**
 * User object schema (public fields)
 */
const expectUserSchema = (user) => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('email');
  expect(typeof user.id).toBe('string');
  expect(typeof user.username).toBe('string');
  expect(typeof user.email).toBe('string');
  // Should NOT expose sensitive fields
  expect(user).not.toHaveProperty('password');
  expect(user).not.toHaveProperty('verificationToken');
};

/**
 * Room object schema (core fields that should always be present)
 */
const expectRoomSchema = (room) => {
  expect(room).toHaveProperty('id');
  expect(room).toHaveProperty('name');
  expect(room).toHaveProperty('code');
  expect(room).toHaveProperty('isPublic');
  expect(typeof room.id).toBe('string');
  expect(typeof room.name).toBe('string');
  expect(typeof room.code).toBe('string');
  expect(typeof room.isPublic).toBe('boolean');
};

/**
 * Auth response schema (login/register)
 */
const expectAuthResponseSchema = (data) => {
  expect(data).toHaveProperty('token');
  expect(data).toHaveProperty('user');
  expect(typeof data.token).toBe('string');
  expectUserSchema(data.user);
};

/**
 * Snapshot/History item schema
 */
const expectHistoryItemSchema = (item) => {
  expect(item).toHaveProperty('version');
  expect(item).toHaveProperty('createdAt');
  expect(item).toHaveProperty('createdBy');
  expect(typeof item.version).toBe('number');
  expect(typeof item.createdBy).toBe('string');
};

// =============================================================================
// HELPER: Get auth token for a user
// =============================================================================
async function getAuthToken(email = 'test@example.com', username = 'testuser') {
  const user = await createVerifiedUser({ email, username });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ emailOrPhoneOrUsername: email, password: 'password123' });
  return { token: res.body.data.token, user };
}

// =============================================================================
// CONTRACT TESTS
// =============================================================================

describe('API Contract Tests', () => {

  // ===========================================================================
  // AUTH CONTRACTS
  // ===========================================================================

  describe('Auth API Contracts', () => {
    
    describe('POST /api/auth/register', () => {
      it('should return auth response schema on success', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            username: uniqueUsername(),
            email: uniqueEmail(),
            password: 'password123'
          });

        expect(res.status).toBe(201);
        expectSuccessResponse(res.body);
        expectAuthResponseSchema(res.body.data);
      });

      it('should return error schema on validation failure', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ username: 'x' }); // Invalid

        expect(res.status).toBeGreaterThanOrEqual(400);
        expectErrorResponse(res.body);
      });
    });

    describe('POST /api/auth/login', () => {
      it('should return auth response schema on success', async () => {
        const email = uniqueEmail();
        await createVerifiedUser({ email, username: uniqueUsername() });

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            emailOrPhoneOrUsername: email,
            password: 'password123'
          });

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expectAuthResponseSchema(res.body.data);
      });

      it('should return error schema on invalid credentials', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            emailOrPhoneOrUsername: 'nonexistent@example.com',
            password: 'wrongpassword'
          });

        expect(res.status).toBe(401);
        expectErrorResponse(res.body);
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return user schema', async () => {
        const { token } = await getAuthToken(uniqueEmail(), uniqueUsername());

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        // GET /me returns { user: {...} }
        expectUserSchema(res.body.data.user);
      });

      it('should return 401 without token', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
        expectErrorResponse(res.body);
      });
    });

    describe('GET /api/auth/check-availability', () => {
      it('should return availability object', async () => {
        const res = await request(app)
          .get('/api/auth/check-availability')
          .query({ email: uniqueEmail() });

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expect(res.body.data).toHaveProperty('email');
        expect(res.body.data.email).toHaveProperty('available');
        expect(typeof res.body.data.email.available).toBe('boolean');
      });
    });
  });

  // ===========================================================================
  // ROOM CONTRACTS
  // ===========================================================================

  describe('Room API Contracts', () => {

    describe('POST /api/rooms', () => {
      it('should return room schema on creation', async () => {
        const { token } = await getAuthToken(uniqueEmail(), uniqueUsername());

        const res = await request(app)
          .post('/api/rooms')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'New Contract Room' });

        expect(res.status).toBe(201);
        expectSuccessResponse(res.body);
        expectRoomSchema(res.body.data.room);
      });
    });

    describe('GET /api/rooms', () => {
      it('should return array of room schemas', async () => {
        const { token, user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        await createTestRoom(user._id, { code: uniqueCode() });

        const res = await request(app)
          .get('/api/rooms')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        // GET /rooms returns { rooms: [...] }
        expect(res.body.data).toHaveProperty('rooms');
        expect(Array.isArray(res.body.data.rooms)).toBe(true);
      });
    });

    describe('GET /api/rooms/:code', () => {
      it('should return room schema', async () => {
        const { token, user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(user._id, { code: uniqueCode() });

        const res = await request(app)
          .get(`/api/rooms/${room.code}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expectRoomSchema(res.body.data.room);
      });

      it('should include isOwner flag for authenticated user', async () => {
        const { token, user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(user._id, { code: uniqueCode() });

        const res = await request(app)
          .get(`/api/rooms/${room.code}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.body.data.room).toHaveProperty('isOwner');
        expect(typeof res.body.data.room.isOwner).toBe('boolean');
      });

      it('should return 404 for non-existent room', async () => {
        const { token } = await getAuthToken(uniqueEmail(), uniqueUsername());

        const res = await request(app)
          .get('/api/rooms/NONEXISTENT')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expectErrorResponse(res.body);
      });
    });

    describe('POST /api/rooms/:code/join', () => {
      it('should return room schema on join', async () => {
        // Owner creates room
        const { user: owner } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(owner._id, { code: uniqueCode() });

        // Another user joins
        const { token: joinerToken } = await getAuthToken(uniqueEmail(), uniqueUsername());

        const res = await request(app)
          .post(`/api/rooms/${room.code}/join`)
          .set('Authorization', `Bearer ${joinerToken}`);

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expectRoomSchema(res.body.data.room);
      });

      it('should support guest join with guestName', async () => {
        const { user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(user._id, { code: uniqueCode() });

        const res = await request(app)
          .post(`/api/rooms/${room.code}/join`)
          .send({ guestName: 'Guest User' });

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expectRoomSchema(res.body.data.room);
        // Guest join returns room data (guestId is managed via headers/socket)
      });
    });

    describe('PATCH /api/rooms/:code', () => {
      it('should return updated room schema', async () => {
        const { token, user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(user._id, { code: uniqueCode() });

        const res = await request(app)
          .patch(`/api/rooms/${room.code}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Updated Room Name' });

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expectRoomSchema(res.body.data.room);
        expect(res.body.data.room.name).toBe('Updated Room Name');
      });
    });

    describe('GET /api/rooms/:code/history', () => {
      it('should return array of history item schemas', async () => {
        const { token, user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(user._id, { code: uniqueCode() });

        const res = await request(app)
          .get(`/api/rooms/${room.code}/history`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expect(res.body.data).toHaveProperty('history');
        expect(Array.isArray(res.body.data.history)).toBe(true);
      });

      it('should return 403 for non-owner', async () => {
        const { user: owner } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(owner._id, { code: uniqueCode() });

        const { token: otherToken } = await getAuthToken(uniqueEmail(), uniqueUsername());

        const res = await request(app)
          .get(`/api/rooms/${room.code}/history`)
          .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(403);
        expectErrorResponse(res.body);
      });
    });

    describe('DELETE /api/rooms/:code', () => {
      it('should return success message', async () => {
        const { token, user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        const room = await createTestRoom(user._id, { code: uniqueCode() });

        const res = await request(app)
          .delete(`/api/rooms/${room.code}`)
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        expect(res.body.data).toHaveProperty('message');
        expect(typeof res.body.data.message).toBe('string');
      });
    });

    describe('GET /api/rooms/public', () => {
      it('should return array of public room schemas', async () => {
        const { user } = await getAuthToken(uniqueEmail(), uniqueUsername());
        await createTestRoom(user._id, { code: uniqueCode(), isPublic: true });

        const res = await request(app).get('/api/rooms/public');

        expect(res.status).toBe(200);
        expectSuccessResponse(res.body);
        // GET /rooms/public returns { rooms: [...] }
        expect(res.body.data).toHaveProperty('rooms');
        expect(Array.isArray(res.body.data.rooms)).toBe(true);
      });
    });
  });
});
