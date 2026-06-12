/**
 * Room State Response DTO
 * Defines the strict API contract for joining a room or getting the full state.
 * Formats Domain Entities into a flat, client-friendly structure.
 */
class RoomStateResponseDTO {
  /**
   * @param {Object} params
   * @param {import('../../sketch/domain/sketch.entity')} params.sketch
   * @param {import('../domain/participant.entity')[]} params.participants
   * @param {import('../domain/participant.entity')} params.currentParticipant
   */
  static serialize({ sketch, participants, currentParticipant }) {
    return {
      state: {
        strokes: sketch.strokes.map(stroke => stroke.toJSON()),
        version: sketch.version,
        sequenceCounter: sketch.sequenceCounter
      },
      participants: participants.map(p => p.toJSON()),
      participant: currentParticipant.toJSON(),
      totalParticipants: participants.length
    };
  }
}

module.exports = RoomStateResponseDTO;
