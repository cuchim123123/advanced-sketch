/**
 * Participant Mapper
 * Anti-Corruption Layer translating between Mongoose SessionParticipant and ParticipantEntity.
 */
const ParticipantEntity = require('../../domain/participant.entity');

class ParticipantMapper {
  /**
   * Maps a raw Mongoose document (populated with User) to a ParticipantEntity.
   * 
   * @param {Object} rawDoc - Lean Mongoose document
   * @returns {ParticipantEntity|null}
   */
  static toDomain(rawDoc) {
    if (!rawDoc) return null;
    
    // Safely extract populated user info or use IDs
    const user = rawDoc.user || {};
    const userId = user._id?.toString() || user.id || rawDoc.user?.toString();
    
    return new ParticipantEntity({
      id: userId,
      username: user.username || rawDoc.username, // Fallback for raw objects
      avatar: user.avatar,
      isGuest: !!rawDoc.isGuest,
      color: rawDoc.color,
      isActive: rawDoc.isActive,
      socketId: rawDoc.socketId,
      cursor: rawDoc.cursor
    });
  }
}

module.exports = ParticipantMapper;
