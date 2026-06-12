/**
 * Disconnect Handler
 */
const { getGuestParticipant, setGuestParticipant, getRoomGuests, cleanupRoomGuests } = require('../../../../socket/roomState');

class DisconnectHandler {
  constructor(roomRepository, participantRepository, stateAdapter, eventPublisher, autoSaveAdapter) {
    this.roomRepository = roomRepository;
    this.participantRepository = participantRepository;
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  async execute({ socketId, roomCode, user, isGuest }) {
    if (!roomCode) return;

    // Clean up preview strokes (Memory leak prevention)
    const sketch = await this.stateAdapter.getSketch(roomCode);
    if (sketch && sketch.previewStrokesCache) {
       // In our new architecture, preview strokes are stateless relays!
       // But if we kept the cache, we would clear it here.
       // The new `drawingHandlers.js` does NOT cache preview strokes in state Adapter anymore.
    }

    if (isGuest) {
      const guest = getGuestParticipant(roomCode, user.id);
      if (guest) {
        guest.isActive = false;
        setGuestParticipant(roomCode, user.id, guest);
      }
    } else {
      await this.participantRepository.deactivateBySocketId(socketId);
    }

    this.eventPublisher.publishToRoom(roomCode, 'user:left', {
      id: user._id || user.id,
      username: user.username,
      isGuest: isGuest
    });

    const room = await this.roomRepository.findByCode(roomCode);
    if (room) {
      const dbCount = await this.participantRepository.getActiveCount(room.id);
      const guestCount = getRoomGuests(roomCode).filter(g => g.isActive).length;
      
      this.eventPublisher.publishToRoom('dashboard', 'dashboard:roomUpdate', {
        roomCode: roomCode,
        participantCount: dbCount + guestCount
      }); // Note: emit to global or a specific dashboard room

      // Force save any pending changes
      if (this.autoSaveAdapter) {
        await this.autoSaveAdapter.forceSave(roomCode, this.stateAdapter);
      }

      // Check if room is empty
      const totalActive = dbCount + getRoomGuests(roomCode).length;
      if (totalActive === 0) {
        if (sketch && sketch.strokes && sketch.strokes.length > 0) {
          const { SketchHistory } = require('../../../../models');
          await SketchHistory.create({
            room: room.id,
            version: sketch.version + 1,
            strokes: sketch.strokes
          });
        }

        cleanupRoomGuests(roomCode);

        // Schedule cache eviction
        setTimeout(async () => {
          await this.stateAdapter.deleteSketch(roomCode);
        }, 60000);
      }
    }
  }
}

module.exports = DisconnectHandler;
