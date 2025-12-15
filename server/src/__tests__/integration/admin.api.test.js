/**
 * Admin API Integration Tests
 * Based on SPEC FR-ADMIN requirements
 */

const request = require('supertest');
const app = require('../../app');
const { User, Room } = require('../../models');
const { createVerifiedUser } = require('../helpers/testData');
const { generateToken } = require('../../utils/jwt.util');
const roomService = require('../../services/room.service');

describe('Admin API', () => {
  let adminToken;
  let adminUser;
  let regularToken;
  let regularUser;

  beforeEach(async () => {
    // Create admin user
    adminUser = await createVerifiedUser({
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    });
    adminToken = generateToken(adminUser._id);

    // Create regular user
    regularUser = await createVerifiedUser({
      username: 'regular',
      email: 'regular@example.com',
      role: 'user'
    });
    regularToken = generateToken(regularUser._id);
  });

  // =============================================================================
  // USER STATS - FR-ADMIN-01
  // =============================================================================

  describe('GET /api/admin/users/stats', () => {
    test('should return user statistics for admin', async () => {
      // Create additional users
      await createVerifiedUser({ username: 'user1', email: 'user1@example.com' });
      await createVerifiedUser({ username: 'user2', email: 'user2@example.com' });

      const response = await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('guests');
      expect(response.body.data).toHaveProperty('registered');
      expect(response.body.data.total).toBe(4); // admin + regular + 2 created
    });

    test('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });

    test('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/admin/users/stats');

      expect(response.status).toBe(401);
    });
  });

  // =============================================================================
  // GET USERS - FR-ADMIN-02
  // =============================================================================

  describe('GET /api/admin/users', () => {
    test('should return paginated users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('currentPage');
      expect(response.body.data).toHaveProperty('totalPages');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    test('should filter users by search', async () => {
      await createVerifiedUser({ username: 'searchable', email: 'searchable@example.com' });

      const response = await request(app)
        .get('/api/admin/users')
        .query({ search: 'searchable' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.users.some(u => u.username === 'searchable')).toBe(true);
    });

    test('should paginate correctly', async () => {
      // Create additional users
      for (let i = 0; i < 5; i++) {
        await createVerifiedUser({ 
          username: `pageuser${i}`, 
          email: `pageuser${i}@example.com` 
        });
      }

      const page1 = await request(app)
        .get('/api/admin/users')
        .query({ page: 1, limit: 3 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      expect(page1.body.data.users.length).toBe(3);
      expect(page1.body.data.currentPage).toBe(1);
    });

    test('should not return password field', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      response.body.data.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    test('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });

  // =============================================================================
  // DELETE USER - FR-ADMIN-02
  // =============================================================================

  describe('DELETE /api/admin/users/:userId', () => {
    test('should delete user for admin', async () => {
      const userToDelete = await createVerifiedUser({
        username: 'deleteme',
        email: 'deleteme@example.com'
      });

      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.message).toContain('deleted');

      // Verify user is deleted
      const deleted = await User.findById(userToDelete._id);
      expect(deleted).toBeNull();
    });

    test('should return 400 when admin tries to delete self', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    test('should return 404 for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/admin/users/${fakeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('should cascade delete user rooms', async () => {
      const userToDelete = await createVerifiedUser({
        username: 'roomowner',
        email: 'roomowner@example.com'
      });

      // Create room for user
      await roomService.createRoom(userToDelete._id, { name: 'User Room' });

      const response = await request(app)
        .delete(`/api/admin/users/${userToDelete._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      // Verify rooms are deleted
      const rooms = await Room.find({ owner: userToDelete._id });
      expect(rooms).toHaveLength(0);
    });

    test('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });

  // =============================================================================
  // ROOM STATS - FR-ADMIN-03
  // =============================================================================

  describe('GET /api/admin/rooms/stats', () => {
    test('should return room statistics for admin', async () => {
      // Create some rooms
      await roomService.createRoom(adminUser._id, { name: 'Room 1' });
      await roomService.createRoom(adminUser._id, { name: 'Room 2' });

      const response = await request(app)
        .get('/api/admin/rooms/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('inactive');
      expect(response.body.data.total).toBe(2);
    });

    test('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/rooms/stats')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });

  // =============================================================================
  // GET ROOMS - FR-ADMIN-04
  // =============================================================================

  describe('GET /api/admin/rooms', () => {
    test('should return paginated rooms for admin', async () => {
      await roomService.createRoom(adminUser._id, { name: 'Admin Room' });

      const response = await request(app)
        .get('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('rooms');
      expect(response.body.data).toHaveProperty('currentPage');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.rooms)).toBe(true);
    });

    test('should filter rooms by search', async () => {
      await roomService.createRoom(adminUser._id, { name: 'Searchable Room' });
      await roomService.createRoom(adminUser._id, { name: 'Other Room' });

      const response = await request(app)
        .get('/api/admin/rooms')
        .query({ search: 'Searchable' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.rooms.some(r => r.name === 'Searchable Room')).toBe(true);
    });

    test('should include owner info', async () => {
      await roomService.createRoom(adminUser._id, { name: 'Owner Info Room' });

      const response = await request(app)
        .get('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.rooms[0].owner).toHaveProperty('username');
    });

    test('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/rooms')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });

  // =============================================================================
  // DELETE ROOM - FR-ADMIN-04
  // =============================================================================

  describe('DELETE /api/admin/rooms/:roomId', () => {
    test('should delete room for admin', async () => {
      const room = await roomService.createRoom(regularUser._id, { name: 'Delete This Room' });

      const response = await request(app)
        .delete(`/api/admin/rooms/${room._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.message).toContain('deleted');

      // Verify room is deleted
      const deleted = await Room.findById(room._id);
      expect(deleted).toBeNull();
    });

    test('should return 404 for non-existent room', async () => {
      const fakeRoomId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/admin/rooms/${fakeRoomId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    test('should return 403 for non-admin user', async () => {
      const room = await roomService.createRoom(adminUser._id, { name: 'Protected Room' });

      const response = await request(app)
        .delete(`/api/admin/rooms/${room._id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
    });
  });
});
