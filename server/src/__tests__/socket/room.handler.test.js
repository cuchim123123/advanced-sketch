/**
 * Socket.IO Room Handler Tests
 * Tests per SPEC FR-ROOM and FR-REALTIME module requirements
 */

const {
  handleRoomJoin,
  handleRoomRestore,
  handleUserKick,
  handleDisconnect,
  handleChatSend
} = require('../../socket/roomHandlers');

// Mock dependencies
jest.mock('../../models', () => ({
  Room: {
    findOne: jest.fn()
  },
  SessionParticipant: {
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue([])
    })
  },
  SketchHistory: {
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn()
      })
    }),
    create: jest.fn()
  },
  User: {}
}));

jest.mock('../../socket/roomState', () => ({
  getRoomState: jest.fn(),
  setRoomState: jest.fn(),
  hasRoomState: jest.fn(),
  deleteRoomState: jest.fn(),
  isRoomInitializing: jest.fn(),
  markRoomInitializing: jest.fn(),
  waitForRoomReady: jest.fn(),
  completeRoomInit: jest.fn(),
  getGuestParticipant: jest.fn(),
  setGuestParticipant: jest.fn(),
  getRoomGuests: jest.fn(),
  cleanupRoomGuests: jest.fn()
}));

jest.mock('../../socket/autoSave', () => ({
  forceSave: jest.fn()
}));

jest.mock('../../libs/logger.lib', () => ({
  socket: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}));

const { Room, SessionParticipant, SketchHistory } = require('../../models');
const { 
  getRoomState, 
  hasRoomState, 
  getGuestParticipant,
  getRoomGuests 
} = require('../../socket/roomState');

describe('Room Handlers (FR-ROOM & FR-REALTIME)', () => {
  let mockSocket;
  let mockIo;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      id: 'socket-123',
      roomCode: null,
      user: {
        _id: 'user-123',
        id: 'user-123',
        username: 'TestUser'
      },
      isGuest: false,
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnThis(),
      broadcast: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn()
      }
    };

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Default mocks
    hasRoomState.mockReturnValue(true);
    getRoomState.mockReturnValue({
      strokes: [],
      version: 1
    });
    getRoomGuests.mockReturnValue([]);
  });

  describe('FR-ROOM: Room Join', () => {
    it('should join room successfully when room exists', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM',
        name: 'Test Room',
        isActive: true
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      SessionParticipant.findOneAndUpdate.mockResolvedValue({});

      await handleRoomJoin(mockSocket, mockIo, { roomCode: 'TESTROOM' });

      expect(mockSocket.join).toHaveBeenCalledWith('TESTROOM');
      expect(mockSocket.roomCode).toBe('TESTROOM');
    });

    it('should emit error when room not found', async () => {
      Room.findOne.mockResolvedValue(null);

      await handleRoomJoin(mockSocket, mockIo, { roomCode: 'INVALID' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Room not found' });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should reject join when room is full', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM',
        isActive: true,
        maxParticipants: 2
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      // Room has 2 participants (at capacity)
      SessionParticipant.countDocuments.mockResolvedValue(2);
      getRoomGuests.mockReturnValue([]);

      await handleRoomJoin(mockSocket, mockIo, { roomCode: 'TESTROOM' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Room is full' });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should reject join when room is inactive', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM',
        isActive: false, // Inactive room
        maxParticipants: 10
      };
      
      Room.findOne.mockResolvedValue(mockRoom);

      await handleRoomJoin(mockSocket, mockIo, { roomCode: 'TESTROOM' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Room is no longer active' });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('should handle guest user joining', async () => {
      mockSocket.isGuest = true;
      mockSocket.user = {
        id: 'guest-123',
        username: 'Guest123',
        isGuest: true
      };

      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM',
        isActive: true
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      getGuestParticipant.mockReturnValue(null);

      await handleRoomJoin(mockSocket, mockIo, { roomCode: 'TESTROOM' });

      expect(mockSocket.join).toHaveBeenCalledWith('TESTROOM');
      // Guest should not create SessionParticipant in DB
      expect(SessionParticipant.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should emit room:state after joining', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM',
        isActive: true,
        lastActiveAt: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      SessionParticipant.findOneAndUpdate.mockResolvedValue({ color: '#ff0000' });
      SessionParticipant.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });
      getRoomGuests.mockReturnValue([]);
      getRoomState.mockReturnValue({
        strokes: [{ id: 'stroke-1', tool: 'pen' }],
        version: 2
      });

      await handleRoomJoin(mockSocket, mockIo, { roomCode: 'TESTROOM' });

      expect(mockSocket.emit).toHaveBeenCalledWith('room:state', expect.objectContaining({
        strokes: expect.any(Array)
      }));
    });
  });

  describe('FR-REALTIME-04: Participant Presence', () => {
    it('should broadcast user:joined to room', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM',
        isActive: true,
        lastActiveAt: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      SessionParticipant.findOneAndUpdate.mockResolvedValue({ color: '#ff0000' });
      SessionParticipant.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });
      getRoomGuests.mockReturnValue([]);
      getRoomState.mockReturnValue({
        strokes: [],
        version: 1
      });

      await handleRoomJoin(mockSocket, mockIo, { roomCode: 'TESTROOM' });

      // Should broadcast to other users in room
      expect(mockSocket.to).toHaveBeenCalledWith('TESTROOM');
    });
  });

  describe('FR-CHAT-01: In-Room Chat', () => {
    beforeEach(() => {
      mockSocket.roomCode = 'TESTROOM';
    });

    it('should broadcast chat message to room', () => {
      handleChatSend(mockSocket, mockIo, { message: 'Hello everyone!' });

      expect(mockIo.to).toHaveBeenCalledWith('TESTROOM');
      expect(mockIo.emit).toHaveBeenCalledWith('chat:message', expect.objectContaining({
        message: 'Hello everyone!',
        user: expect.objectContaining({
          username: 'TestUser'
        }),
        timestamp: expect.any(String)
      }));
    });

    it('should reject message exceeding 1000 characters', () => {
      const longMessage = 'A'.repeat(1001);

      handleChatSend(mockSocket, mockIo, { message: longMessage });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('1000')
      }));
      expect(mockIo.emit).not.toHaveBeenCalledWith('chat:message', expect.anything());
    });

    it('should sanitize XSS in chat message', () => {
      handleChatSend(mockSocket, mockIo, { message: '<script>alert("xss")</script>' });

      expect(mockIo.emit).toHaveBeenCalledWith('chat:message', expect.objectContaining({
        message: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      }));
    });

    it('should not send empty messages', () => {
      handleChatSend(mockSocket, mockIo, { message: '' });

      expect(mockIo.emit).not.toHaveBeenCalledWith('chat:message', expect.anything());
    });

    it('should not send if not in room', () => {
      mockSocket.roomCode = null;

      handleChatSend(mockSocket, mockIo, { message: 'Hello' });

      expect(mockIo.emit).not.toHaveBeenCalledWith('chat:message', expect.anything());
    });
  });

  describe('User Kick', () => {
    beforeEach(() => {
      mockSocket.roomCode = 'TESTROOM';
    });

    it('should kick user when owner requests', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        owner: 'user-123' // Same as socket user
      };
      
      Room.findOne.mockResolvedValue(mockRoom);

      // Mock finding target socket
      const targetSocket = {
        id: 'target-socket',
        user: { _id: 'target-user' },
        emit: jest.fn(),
        leave: jest.fn()
      };

      mockIo.sockets = {
        sockets: new Map([['target-socket', targetSocket]])
      };

      await handleUserKick(mockSocket, mockIo, { targetUserId: 'target-user' });

      // Owner should be able to kick
      expect(Room.findOne).toHaveBeenCalled();
    });

    it('should prevent non-owner from kicking', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        owner: 'different-owner'
      };
      
      Room.findOne.mockResolvedValue(mockRoom);

      await handleUserKick(mockSocket, mockIo, { targetUserId: 'target-user' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('owner')
      }));
    });

    it('should prevent kicking the room owner', async () => {
      // Even if an owner tries to kick themselves via manipulated request,
      // or if there's a bug, we should not allow kicking the owner
      const mockRoom = {
        _id: 'room-id-123',
        owner: 'user-123' // Same as socket user (owner)
      };
      
      Room.findOne.mockResolvedValue(mockRoom);

      // Try to kick the owner
      await handleUserKick(mockSocket, mockIo, { targetUserId: 'user-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('yourself')
      }));
    });
  });

  describe('Disconnect Handling', () => {
    beforeEach(() => {
      mockSocket.roomCode = 'TESTROOM';
    });

    it('should broadcast user:left on disconnect', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM'
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      SessionParticipant.findOneAndUpdate.mockResolvedValue({});
      SessionParticipant.countDocuments.mockResolvedValue(0);
      getRoomGuests.mockReturnValue([]);

      await handleDisconnect(mockSocket, mockIo);

      expect(mockSocket.to).toHaveBeenCalledWith('TESTROOM');
    });

    it('should mark participant inactive on disconnect', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        code: 'TESTROOM'
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      SessionParticipant.countDocuments.mockResolvedValue(1);

      await handleDisconnect(mockSocket, mockIo);

      expect(SessionParticipant.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ socketId: mockSocket.id }),
        expect.objectContaining({ isActive: false })
      );
    });
  });

  describe('Room Restore (Owner Only)', () => {
    beforeEach(() => {
      mockSocket.roomCode = 'TESTROOM';
    });

    it('should restore room to specific version when owner', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        owner: { _id: 'user-123', toString: () => 'user-123' }
      };
      
      Room.findOne.mockResolvedValue(mockRoom);
      SketchHistory.findOne.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          strokes: [{ id: 'old-stroke' }],
          version: 1
        })
      });

      await handleRoomRestore(mockSocket, mockIo, { version: 1 });

      expect(mockIo.to).toHaveBeenCalledWith('TESTROOM');
      expect(mockIo.emit).toHaveBeenCalledWith('room:restored', expect.objectContaining({
        version: 1
      }));
    });

    it('should reject restore from non-owner', async () => {
      const mockRoom = {
        _id: 'room-id-123',
        owner: { _id: 'different-owner', toString: () => 'different-owner' }
      };
      
      Room.findOne.mockResolvedValue(mockRoom);

      await handleRoomRestore(mockSocket, mockIo, { version: 1 });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('owner')
      }));
    });
  });
});
