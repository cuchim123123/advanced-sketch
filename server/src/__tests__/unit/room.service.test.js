/**
 * Room Service Unit Tests
 */

const roomService = require('../../services/room.service');
const { Room, SketchHistory, SessionParticipant, User } = require('../../models');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils');
const { createTestUser, createVerifiedUser, createTestRoom } = require('../helpers/testData');

describe('Room Service', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await createVerifiedUser({
      username: 'roomowner',
      email: 'owner@example.com'
    });
  });

  // =============================================================================
  // CREATE ROOM
  // =============================================================================

  describe('createRoom()', () => {
    test('should create a new room with default settings', async () => {
      const roomData = { name: 'Test Room' };

      const room = await roomService.createRoom(testUser._id, roomData);

      expect(room).toHaveProperty('code');
      expect(room.name).toBe('Test Room');
      expect(room.owner.toString()).toBe(testUser._id.toString());
      expect(room.isPublic).toBe(false);
      expect(room.maxParticipants).toBeDefined();
    });

    test('should create room with custom settings', async () => {
      const roomData = {
        name: 'Custom Room',
        maxParticipants: 20,
        isPublic: true,
        canvasSettings: {
          width: 1920,
          height: 1080
        }
      };

      const room = await roomService.createRoom(testUser._id, roomData);

      expect(room.name).toBe('Custom Room');
      expect(room.maxParticipants).toBe(20);
      expect(room.isPublic).toBe(true);
      expect(room.canvasSettings).toBeDefined();
    });

    test('should initialize sketch history on room creation', async () => {
      const room = await roomService.createRoom(testUser._id, { name: 'History Test' });

      const history = await SketchHistory.findOne({ room: room._id });
      expect(history).toBeDefined();
      expect(history.version).toBe(1);
      expect(history.strokes).toEqual([]);
    });

    test('should generate unique room codes', async () => {
      const room1 = await roomService.createRoom(testUser._id, { name: 'Room 1' });
      const room2 = await roomService.createRoom(testUser._id, { name: 'Room 2' });

      expect(room1.code).toBeDefined();
      expect(room2.code).toBeDefined();
      expect(room1.code).not.toBe(room2.code);
    });
  });

  // =============================================================================
  // GET ROOMS BY OWNER
  // =============================================================================

  describe('getRoomsByOwner()', () => {
    test('should return rooms owned by user', async () => {
      await roomService.createRoom(testUser._id, { name: 'Room 1' });
      await roomService.createRoom(testUser._id, { name: 'Room 2' });

      const rooms = await roomService.getRoomsByOwner(testUser._id);

      expect(rooms).toHaveLength(2);
      rooms.forEach(room => {
        expect(room.isOwner).toBe(true);
      });
    });

    test('should return empty array if no rooms', async () => {
      const rooms = await roomService.getRoomsByOwner(testUser._id);
      expect(rooms).toEqual([]);
    });

    test('should not return rooms owned by other users', async () => {
      const otherUser = await createVerifiedUser({
        username: 'otheruser',
        email: 'other@example.com'
      });

      await roomService.createRoom(testUser._id, { name: 'My Room' });
      await roomService.createRoom(otherUser._id, { name: 'Other Room' });

      const rooms = await roomService.getRoomsByOwner(testUser._id);

      expect(rooms).toHaveLength(1);
      expect(rooms[0].name).toBe('My Room');
    });
  });

  // =============================================================================
  // GET PUBLIC ROOMS
  // =============================================================================

  describe('getPublicRooms()', () => {
    test('should return only public rooms', async () => {
      await roomService.createRoom(testUser._id, { name: 'Public Room', isPublic: true });
      await roomService.createRoom(testUser._id, { name: 'Private Room', isPublic: false });

      const rooms = await roomService.getPublicRooms();

      expect(rooms).toHaveLength(1);
      expect(rooms[0].name).toBe('Public Room');
    });

    test('should not return inactive rooms', async () => {
      const room = await roomService.createRoom(testUser._id, { name: 'Inactive Room', isPublic: true });
      await Room.findByIdAndUpdate(room._id, { isActive: false });

      const rooms = await roomService.getPublicRooms();

      expect(rooms).toHaveLength(0);
    });
  });

  // =============================================================================
  // GET ROOM BY CODE
  // =============================================================================

  describe('getRoomByCode()', () => {
    test('should return room by code', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Find Me' });

      const room = await roomService.getRoomByCode(createdRoom.code);

      expect(room.name).toBe('Find Me');
      expect(room.code).toBe(createdRoom.code);
    });

    test('should throw NotFoundError for invalid code', async () => {
      await expect(
        roomService.getRoomByCode('INVALID')
      ).rejects.toThrow(NotFoundError);
    });

    test('should populate owner info', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Owner Test' });

      const room = await roomService.getRoomByCode(createdRoom.code);

      expect(room.owner).toHaveProperty('username');
    });
  });

  // =============================================================================
  // JOIN ROOM
  // =============================================================================

  describe('joinRoom()', () => {
    test('should allow joining active room', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Join Me' });

      const room = await roomService.joinRoom(createdRoom.code);

      expect(room.code).toBe(createdRoom.code);
    });

    test('should throw NotFoundError for invalid code', async () => {
      await expect(
        roomService.joinRoom('INVALID')
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw BadRequestError for inactive room', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Inactive' });
      await Room.findByIdAndUpdate(createdRoom._id, { isActive: false });

      await expect(
        roomService.joinRoom(createdRoom.code)
      ).rejects.toThrow(BadRequestError);
    });

    test('should throw BadRequestError when room is full', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, {
        name: 'Small Room',
        maxParticipants: 2
      });

      // Simulate 2 participants (room is full)
      const otherUser = await createVerifiedUser({
        username: 'participant',
        email: 'participant@example.com'
      });
      
      await SessionParticipant.create({
        room: createdRoom._id,
        user: testUser._id,
        socketId: 'socket-1',
        isActive: true
      });
      await SessionParticipant.create({
        room: createdRoom._id,
        user: otherUser._id,
        socketId: 'socket-2',
        isActive: true
      });

      await expect(
        roomService.joinRoom(createdRoom.code)
      ).rejects.toThrow(BadRequestError);
    });
  });

  // =============================================================================
  // UPDATE ROOM
  // =============================================================================

  describe('updateRoom()', () => {
    test('should update room name', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Old Name' });

      const updatedRoom = await roomService.updateRoom(
        createdRoom.code,
        testUser._id,
        { name: 'New Name' }
      );

      expect(updatedRoom.name).toBe('New Name');
    });

    test('should update room visibility', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Toggle Visibility', isPublic: false });

      const updatedRoom = await roomService.updateRoom(
        createdRoom.code,
        testUser._id,
        { isPublic: true }
      );

      expect(updatedRoom.isPublic).toBe(true);
    });

    test('should throw NotFoundError for invalid code', async () => {
      await expect(
        roomService.updateRoom('INVALID', testUser._id, { name: 'New' })
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw ForbiddenError for non-owner', async () => {
      const otherUser = await createVerifiedUser({
        username: 'notowner',
        email: 'notowner@example.com'
      });
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Owner Only' });

      await expect(
        roomService.updateRoom(createdRoom.code, otherUser._id, { name: 'Hacked' })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =============================================================================
  // DELETE ROOM
  // =============================================================================

  describe('deleteRoom()', () => {
    test('should delete room and return success message', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Delete Me' });

      const result = await roomService.deleteRoom(createdRoom.code, testUser._id);

      expect(result.message).toContain('deleted');
      
      const deleted = await Room.findOne({ code: createdRoom.code });
      expect(deleted).toBeNull();
    });

    test('should delete related sketch history', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Delete History' });
      const historyBefore = await SketchHistory.findOne({ room: createdRoom._id });
      expect(historyBefore).toBeDefined();

      await roomService.deleteRoom(createdRoom.code, testUser._id);

      const historyAfter = await SketchHistory.findOne({ room: createdRoom._id });
      expect(historyAfter).toBeNull();
    });

    test('should throw NotFoundError for invalid code', async () => {
      await expect(
        roomService.deleteRoom('INVALID', testUser._id)
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw ForbiddenError for non-owner', async () => {
      const otherUser = await createVerifiedUser({
        username: 'notowner2',
        email: 'notowner2@example.com'
      });
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Protected' });

      await expect(
        roomService.deleteRoom(createdRoom.code, otherUser._id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =============================================================================
  // GET ROOM HISTORY
  // =============================================================================

  describe('getRoomHistory()', () => {
    test('should return history for room owner', async () => {
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'History Room' });

      const history = await roomService.getRoomHistory(createdRoom.code, testUser._id);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('version');
    });

    test('should throw NotFoundError for invalid code', async () => {
      await expect(
        roomService.getRoomHistory('INVALID', testUser._id)
      ).rejects.toThrow(NotFoundError);
    });

    test('should throw ForbiddenError for non-owner', async () => {
      const otherUser = await createVerifiedUser({
        username: 'notowner3',
        email: 'notowner3@example.com'
      });
      const createdRoom = await roomService.createRoom(testUser._id, { name: 'Owner History' });

      await expect(
        roomService.getRoomHistory(createdRoom.code, otherUser._id)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
