/**
 * Join Room Command Handler
 */
const logger = require('../../../../libs/logger.lib');
const { getRoomGuests, setGuestParticipant } = require('../../../../socket/roomState'); // Temporary migration import

const RoomStateResponseDTO = require('../../presentation/dtos/room-state.dto');

class JoinRoomHandler {
  constructor(roomRepository, participantRepository, stateAdapter, eventPublisher) {
    this.roomRepository = roomRepository;
    this.participantRepository = participantRepository;
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
  }

  /**
   * @param {import('../../application/dtos/join-room.command')} command
   */
  async execute(command) {
    const { roomCode, user, socketId, isGuest, previousRoomCode } = command;

    const room = await this.roomRepository.findByCode(roomCode);
    if (!room) throw new Error('Room not found');

    const dbParticipantCount = await this.participantRepository.getActiveCount(room.id);
    const guestCount = getRoomGuests(roomCode).length; // Legacy function for now until fully migrated
    
    // Domain rules check
    room.canJoin(dbParticipantCount + guestCount);

    // Leave previous room if switching
    if (previousRoomCode && previousRoomCode !== roomCode) {
      logger.socket(`User ${user?.username} left room ${previousRoomCode} to join ${roomCode}`);
    }

    let participantColor = `hsl(${Math.random() * 360}, 70%, 50%)`;

    // Persist Participant
    if (isGuest) {
      // Handle guest participant
      const participant = {
        id: user.id,
        username: user.username,
        isGuest: true,
        color: participantColor,
        socketId: socketId,
        isActive: true
      };
      setGuestParticipant(roomCode, user.id, participant);
    } else {
      const dbParticipant = await this.participantRepository.upsertParticipant(room.id, user.id, socketId);
      participantColor = dbParticipant.color;
    }

    // Room Initialization Lock (Cache stampede prevention)
    const hasSketch = await this.stateAdapter.hasSketch(roomCode);
    if (!hasSketch) {
      const isInitializing = await this.stateAdapter.isInitializing(roomCode);
      if (isInitializing) {
        logger.socket(`Room ${roomCode} is being initialized, waiting...`);
        await this.stateAdapter.waitForRoomReady(roomCode);
      } else {
        const acquired = await this.stateAdapter.acquireInitLock(roomCode);
        if (acquired) {
          try {
            // Load history from DB (SketchHistory)
            const { SketchHistory } = require('../../../../models');
            const history = await SketchHistory.findOne({ room: room.id }).sort({ version: -1 }).lean();
            
            const SketchEntity = require('../../sketch/domain/sketch.entity');
            const sketch = new SketchEntity(roomCode, {
              strokes: history?.strokes || [],
              version: history?.version || 0
            });
            
            await this.stateAdapter.saveSketch(sketch);
          } finally {
            await this.stateAdapter.releaseInitLock(roomCode);
          }
        } else {
          await this.stateAdapter.waitForRoomReady(roomCode);
        }
      }
    }

    // Prepare participants list to send
    const dbParticipants = await this.participantRepository.getActiveParticipants(room.id);
    const roomGuests = getRoomGuests(roomCode);

    const allParticipants = [
      ...dbParticipants,
      ...roomGuests.map(g => ({
        id: g.id,
        username: g.username,
        color: g.color,
        isGuest: true,
        toJSON: function() { return this; } // Mock entity method for guest
      }))
    ];

    const sketch = await this.stateAdapter.getSketch(roomCode);

    // Update Room activity
    await this.roomRepository.updateLastActive(roomCode);

    const currentParticipant = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      color: participantColor,
      isGuest: isGuest,
      toJSON: function() { return this; }
    };

    return RoomStateResponseDTO.serialize({
      sketch,
      participants: allParticipants,
      currentParticipant
    });
  }
}

module.exports = JoinRoomHandler;
