/**
 * Room API Integration Tests
 * Based on SPEC FR-ROOM requirements
 */

const request = require('supertest');
const app = require('../../app');
const { User, Room } = require('../../models');
const { createVerifiedUser } = require('../helpers/testData');
const { generateToken } = require('../../utils/jwt.util');

describe('Room API', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = await createVerifiedUser({
      username: 'roomtester',
      email: 'roomtester@example.com'
    });
    authToken = generateToken(testUser._id);
  });

  // =============================================================================
  // CREATE ROOM - FR-ROOM-01
  // =============================================================================

  describe('POST /api/rooms', () => {
    test('should create room with default settings', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Room' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.room).toHaveProperty('code');
      expect(response.body.data.room.name).toBe('Test Room');
      expect(response.body.data.room.isPublic).toBe(false);
      expect(response.body.data.room.maxParticipants).toBeDefined();
    });

    test('should create room with custom settings', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Custom Room',
          maxParticipants: 25,
          isPublic: true
        });

      expect(response.status).toBe(201);
      expect(response.body.data.room.name).toBe('Custom Room');
      expect(response.body.data.room.maxParticipants).toBe(25);
      expect(response.body.data.room.isPublic).toBe(true);
    });

    test('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send({ name: 'Unauthorized Room' });

      expect(response.status).toBe(401);
    });

    test('should generate unique 8-char room code', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Code Test Room' });

      expect(response.status).toBe(201);
      expect(response.body.data.room.code).toHaveLength(8);
      expect(response.body.data.room.code).toMatch(/^[A-Z0-9]+$/);
    });
  });

  // =============================================================================
  // GET USER'S ROOMS - FR-ROOM-02
  // =============================================================================

  describe('GET /api/rooms', () => {
    test('should return rooms owned by user', async () => {
      // Create rooms first
      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Room 1' });

      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Room 2' });

      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toHaveLength(2);
    });

    test('should return empty array if user has no rooms', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toEqual([]);
    });

    test('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/rooms');

      expect(response.status).toBe(401);
    });
  });

  // =============================================================================
  // GET PUBLIC ROOMS - FR-ROOM-03
  // =============================================================================

  describe('GET /api/rooms/public', () => {
    test('should return only public rooms', async () => {
      // Create one public and one private room
      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Public Room', isPublic: true });

      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Private Room', isPublic: false });

      const response = await request(app)
        .get('/api/rooms/public');

      expect(response.status).toBe(200);
      expect(response.body.data.rooms).toHaveLength(1);
      expect(response.body.data.rooms[0].name).toBe('Public Room');
    });

    test('should work without authentication', async () => {
      await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Public Room', isPublic: true });

      const response = await request(app)
        .get('/api/rooms/public');

      expect(response.status).toBe(200);
    });
  });

  // =============================================================================
  // GET ROOM BY CODE - FR-ROOM-04
  // =============================================================================

  describe('GET /api/rooms/:code', () => {
    test('should return room by code', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Find Me Room', isPublic: true });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .get(`/api/rooms/${code}`);

      expect(response.status).toBe(200);
      expect(response.body.data.room.name).toBe('Find Me Room');
      expect(response.body.data.room.code).toBe(code);
    });

    test('should return 404 for invalid code', async () => {
      const response = await request(app)
        .get('/api/rooms/INVALID1');

      expect(response.status).toBe(404);
    });

    test('should populate owner info', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Owner Room', isPublic: true });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .get(`/api/rooms/${code}`);

      expect(response.status).toBe(200);
      expect(response.body.data.room.owner).toHaveProperty('username');
    });
  });

  // =============================================================================
  // JOIN ROOM - FR-ROOM-05
  // =============================================================================

  describe('POST /api/rooms/:code/join', () => {
    test('should allow joining active room', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Join Me Room', isPublic: true });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .post(`/api/rooms/${code}/join`);

      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent room', async () => {
      const response = await request(app)
        .post('/api/rooms/INVALID1/join');

      expect(response.status).toBe(404);
    });

    test('should return 400 for inactive room', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Inactive Room', isPublic: true });

      const code = createResponse.body.data.room.code;
      
      // Mark room as inactive
      await Room.findOneAndUpdate({ code }, { isActive: false });

      const response = await request(app)
        .post(`/api/rooms/${code}/join`);

      expect(response.status).toBe(400);
    });
  });

  // =============================================================================
  // UPDATE ROOM - FR-ROOM-06
  // =============================================================================

  describe('PATCH /api/rooms/:code', () => {
    test('should update room name', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Original Name' });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .patch(`/api/rooms/${code}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.room.name).toBe('Updated Name');
    });

    test('should update room visibility', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Visibility Test', isPublic: false });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .patch(`/api/rooms/${code}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPublic: true });

      expect(response.status).toBe(200);
      expect(response.body.data.room.isPublic).toBe(true);
    });

    test('should clamp maxParticipants to 2-50 range', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Clamp Test' });

      const code = createResponse.body.data.room.code;

      // Test clamping to max 50
      const response = await request(app)
        .patch(`/api/rooms/${code}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ maxParticipants: 100 });

      expect(response.status).toBe(200);
      expect(response.body.data.room.maxParticipants).toBeLessThanOrEqual(50);
    });

    test('should return 403 for non-owner', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Not My Room' });

      const code = createResponse.body.data.room.code;

      // Create another user
      const otherUser = await createVerifiedUser({
        username: 'otheruser',
        email: 'other@example.com'
      });
      const otherToken = generateToken(otherUser._id);

      const response = await request(app)
        .patch(`/api/rooms/${code}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(403);
    });

    test('should return 401 without auth token', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'No Auth Room' });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .patch(`/api/rooms/${code}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(401);
    });
  });

  // =============================================================================
  // DELETE ROOM - FR-ROOM-07
  // =============================================================================

  describe('DELETE /api/rooms/:code', () => {
    test('should delete room successfully', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Delete Me Room' });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .delete(`/api/rooms/${code}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.message).toContain('deleted');

      // Verify room is deleted
      const getResponse = await request(app)
        .get(`/api/rooms/${code}`);
      expect(getResponse.status).toBe(404);
    });

    test('should return 403 for non-owner', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Protected Room' });

      const code = createResponse.body.data.room.code;

      // Create another user
      const otherUser = await createVerifiedUser({
        username: 'attacker',
        email: 'attacker@example.com'
      });
      const otherToken = generateToken(otherUser._id);

      const response = await request(app)
        .delete(`/api/rooms/${code}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    test('should return 404 for non-existent room', async () => {
      const response = await request(app)
        .delete('/api/rooms/NOTEXIST')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  // =============================================================================
  // GET ROOM HISTORY - FR-ROOM-08
  // =============================================================================

  describe('GET /api/rooms/:code/history', () => {
    test('should return history for room owner', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'History Room' });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .get(`/api/rooms/${code}/history`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data.history)).toBe(true);
    });

    test('should return 403 for non-owner', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Private History Room' });

      const code = createResponse.body.data.room.code;

      // Create another user
      const otherUser = await createVerifiedUser({
        username: 'spy',
        email: 'spy@example.com'
      });
      const otherToken = generateToken(otherUser._id);

      const response = await request(app)
        .get(`/api/rooms/${code}/history`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    test('should return 401 without auth token', async () => {
      const createResponse = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Auth Required Room' });

      const code = createResponse.body.data.room.code;

      const response = await request(app)
        .get(`/api/rooms/${code}/history`);

      expect(response.status).toBe(401);
    });
  });
});
