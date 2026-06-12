/**
 * Participant Repository
 * Infrastructure Adapter for Mongoose SessionParticipant models
 */
const { SessionParticipant, User } = require('../../../../models');
const ParticipantMapper = require('./mappers/participant.mapper');

class ParticipantRepository {
  async getActiveCount(roomId) {
    return SessionParticipant.countDocuments({
      room: roomId,
      isActive: true
    });
  }

  async upsertParticipant(roomId, userId, socketId) {
    const participant = await SessionParticipant.findOneAndUpdate(
      { room: roomId, user: userId },
      {
        socketId: socketId,
        isActive: true,
        lastActiveAt: new Date()
      },
      { upsert: true, new: true }
    ).populate('user', 'username avatar').lean();

    return ParticipantMapper.toDomain(participant);
  }

  async getActiveParticipants(roomId) {
    const participants = await SessionParticipant.find({
      room: roomId,
      isActive: true
    }).populate('user', 'username avatar').lean();

    return participants.map(p => ParticipantMapper.toDomain(p)).filter(Boolean);
  }

  async deactivateParticipant(roomId, userId) {
    return SessionParticipant.findOneAndUpdate(
      { room: roomId, user: userId },
      { isActive: false },
      { new: true }
    );
  }

  async deactivateBySocketId(socketId) {
    return SessionParticipant.findOneAndUpdate(
      { socketId: socketId },
      { isActive: false },
      { new: true }
    );
  }
}

module.exports = ParticipantRepository;
