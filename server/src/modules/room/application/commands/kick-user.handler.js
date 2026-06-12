/**
 * Kick User Command Handler
 */
const { getGuestParticipant, setGuestParticipant } = require('../../../../socket/roomState');

class KickUserHandler {
  constructor(roomRepository, participantRepository, eventPublisher) {
    this.roomRepository = roomRepository;
    this.participantRepository = participantRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute({ roomCode, kickerId, targetId }) {
    const room = await this.roomRepository.findByCode(roomCode);
    if (!room) throw new Error('Room not found');

    // Domain Rules
    room.canKickUser(kickerId, targetId);

    // Try to find target in DB
    const participants = await this.participantRepository.getActiveParticipants(room.id);
    let targetParticipant = participants.find(p => p.user.id === targetId);

    let isGuestKick = false;
    let guestInfo = null;

    if (!targetParticipant) {
      guestInfo = getGuestParticipant(roomCode, targetId);
      if (guestInfo && guestInfo.isActive) {
        isGuestKick = true;
        targetParticipant = guestInfo;
      }
    }

    if (!targetParticipant) {
      throw new Error('User not found in room');
    }

    const targetSocketId = targetParticipant.socketId;

    // Send specific kick event to target socket
    this.eventPublisher.publishToUser(targetSocketId, 'user:kicked');

    if (isGuestKick) {
      guestInfo.isActive = false;
      setGuestParticipant(roomCode, targetId, guestInfo);

      this.eventPublisher.publishToRoom(roomCode, 'user:left', {
        id: targetId,
        username: guestInfo.username,
        isGuest: true
      });
    } else {
      await this.participantRepository.deactivateParticipant(room.id, targetId);

      this.eventPublisher.publishToRoom(roomCode, 'user:left', {
        id: targetId,
        username: targetParticipant.user.username,
        isGuest: false
      });
    }

    return targetSocketId; // Gateway needs this to force disconnect socket
  }
}

module.exports = KickUserHandler;
