/**
 * Admin Service Unit Tests
 */

const adminService = require('../../services/admin.service');
const { User, Room, SessionParticipant, OTP } = require('../../models');
const { NotFoundError, BadRequestError } = require('../../utils');
const { createVerifiedUser, createTestRoom } = require('../helpers/testData');
const roomService = require('../../services/room.service');

describe('Admin Service', () => {
  let adminUser;

  beforeEach(async () => {
    adminUser = await createVerifiedUser({
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    });
  });

  // =============================================================================
  // GET USER STATS
  // =============================================================================

  describe('getUserStats()', () => {
    test('should return correct user statistics', async () => {
      // Create some additional users
      await createVerifiedUser({ username: 'user1', email: 'user1@example.com' });
      await createVerifiedUser({ username: 'user2', email: 'user2@example.com' });

      const stats = await adminService.getUserStats();

      expect(stats.total).toBe(3); // admin + 2 users
      expect(stats.guests).toBe(0); // No guests (isGuest field may not exist)
      expect(stats.registered).toBe(3);
    });

    test('should return zero stats for empty database', async () => {
      // Only admin exists from beforeEach
      const stats = await adminService.getUserStats();

      expect(stats.total).toBe(1);
      expect(stats.guests).toBe(0);
      expect(stats.registered).toBe(1);
    });
  });

  // =============================================================================
  // GET USERS
  // =============================================================================

  describe('getUsers()', () => {
    test('should return paginated users', async () => {
      // Create users
      await createVerifiedUser({ username: 'user1', email: 'user1@example.com' });
      await createVerifiedUser({ username: 'user2', email: 'user2@example.com' });

      const result = await adminService.getUsers({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(3); // admin + 2 users
      expect(result.currentPage).toBe(1);
      expect(result.total).toBe(3);
    });

    test('should filter users by search', async () => {
      await createVerifiedUser({ username: 'searchable', email: 'searchable@example.com' });
      await createVerifiedUser({ username: 'other', email: 'other@example.com' });

      const result = await adminService.getUsers({ search: 'searchable' });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe('searchable');
    });

    test('should paginate correctly', async () => {
      // Create 5 users
      for (let i = 1; i <= 5; i++) {
        await createVerifiedUser({ 
          username: `user${i}`, 
          email: `user${i}@example.com` 
        });
      }

      const page1 = await adminService.getUsers({ page: 1, limit: 3 });
      const page2 = await adminService.getUsers({ page: 2, limit: 3 });

      expect(page1.users).toHaveLength(3);
      expect(page2.users).toHaveLength(3);
      expect(page1.totalPages).toBe(2);
    });

    test('should not return password field', async () => {
      const result = await adminService.getUsers({ page: 1, limit: 10 });

      result.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  // =============================================================================
  // DELETE USER
  // =============================================================================

  describe('deleteUser()', () => {
    test('should delete user successfully', async () => {
      const userToDelete = await createVerifiedUser({
        username: 'deleteme',
        email: 'deleteme@example.com'
      });

      const result = await adminService.deleteUser(
        userToDelete._id.toString(),
        adminUser._id.toString()
      );

      expect(result.message).toContain('deleted');
      
      const deleted = await User.findById(userToDelete._id);
      expect(deleted).toBeNull();
    });

    test('should delete user rooms cascade', async () => {
      const userToDelete = await createVerifiedUser({
        username: 'roomowner',
        email: 'roomowner@example.com'
      });

      // Create a room for the user
      await roomService.createRoom(userToDelete._id, { name: 'User Room' });

      await adminService.deleteUser(
        userToDelete._id.toString(),
        adminUser._id.toString()
      );

      const rooms = await Room.find({ owner: userToDelete._id });
      expect(rooms).toHaveLength(0);
    });

    test('should throw BadRequestError when deleting self', async () => {
      await expect(
        adminService.deleteUser(adminUser._id.toString(), adminUser._id.toString())
      ).rejects.toThrow(BadRequestError);
    });

    test('should throw NotFoundError for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';

      await expect(
        adminService.deleteUser(fakeUserId, adminUser._id.toString())
      ).rejects.toThrow(NotFoundError);
    });

    test('should cleanup user OTPs', async () => {
      const userToDelete = await createVerifiedUser({
        username: 'otpuser',
        email: 'otpuser@example.com'
      });

      // Create OTP for user
      await OTP.create({
        email: 'otpuser@example.com',
        code: '123456',
        purpose: 'email_verification',
        expiresAt: new Date(Date.now() + 60000)
      });

      await adminService.deleteUser(
        userToDelete._id.toString(),
        adminUser._id.toString()
      );

      const otps = await OTP.find({ email: 'otpuser@example.com' });
      expect(otps).toHaveLength(0);
    });
  });

  // =============================================================================
  // GET ROOM STATS
  // =============================================================================

  describe('getRoomStats()', () => {
    test('should return correct room statistics', async () => {
      // Create rooms
      const room1 = await roomService.createRoom(adminUser._id, { name: 'Room 1' });
      const room2 = await roomService.createRoom(adminUser._id, { name: 'Room 2' });

      // Make one room active
      await SessionParticipant.create({
        room: room1._id,
        user: adminUser._id,
        socketId: 'test-socket',
        isActive: true
      });

      const stats = await adminService.getRoomStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.inactive).toBe(1);
    });

    test('should return zero stats for empty database', async () => {
      const stats = await adminService.getRoomStats();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
    });
  });

  // =============================================================================
  // GET ROOMS
  // =============================================================================

  describe('getRooms()', () => {
    test('should return paginated rooms', async () => {
      await roomService.createRoom(adminUser._id, { name: 'Room 1' });
      await roomService.createRoom(adminUser._id, { name: 'Room 2' });

      const result = await adminService.getRooms({ page: 1, limit: 10 });

      expect(result.rooms).toHaveLength(2);
      expect(result.currentPage).toBe(1);
      expect(result.total).toBe(2);
    });

    test('should filter rooms by search', async () => {
      await roomService.createRoom(adminUser._id, { name: 'Searchable Room' });
      await roomService.createRoom(adminUser._id, { name: 'Other Room' });

      const result = await adminService.getRooms({ search: 'Searchable' });

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0].name).toBe('Searchable Room');
    });

    test('should include activeParticipants count', async () => {
      const room = await roomService.createRoom(adminUser._id, { name: 'Active Room' });
      
      await SessionParticipant.create({
        room: room._id,
        user: adminUser._id,
        socketId: 'socket-1',
        isActive: true
      });

      const result = await adminService.getRooms({ page: 1, limit: 10 });

      const activeRoom = result.rooms.find(r => r.name === 'Active Room');
      expect(activeRoom.activeParticipants).toBe(1);
    });

    test('should populate owner info', async () => {
      await roomService.createRoom(adminUser._id, { name: 'Owned Room' });

      const result = await adminService.getRooms({ page: 1, limit: 10 });

      expect(result.rooms[0].owner).toHaveProperty('username');
      expect(result.rooms[0].owner).toHaveProperty('email');
    });
  });

  // =============================================================================
  // DELETE ROOM (ADMIN)
  // =============================================================================

  describe('deleteRoom()', () => {
    test('should delete room successfully', async () => {
      const room = await roomService.createRoom(adminUser._id, { name: 'Delete Me' });

      const result = await adminService.deleteRoom(room._id.toString());

      expect(result.message).toContain('deleted');
      
      const deleted = await Room.findById(room._id);
      expect(deleted).toBeNull();
    });

    test('should throw NotFoundError for non-existent room', async () => {
      const fakeRoomId = '507f1f77bcf86cd799439011';

      await expect(
        adminService.deleteRoom(fakeRoomId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
