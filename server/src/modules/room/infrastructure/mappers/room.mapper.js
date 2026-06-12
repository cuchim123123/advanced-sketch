/**
 * Room Mapper
 * Anti-Corruption Layer translating between Mongoose Documents and pure Domain Entities.
 */
const RoomEntity = require('../../domain/room.entity');

class RoomMapper {
  /**
   * Maps a raw Mongoose document to a pure RoomEntity.
   * Prevents Infrastructure leakage into the Application layer.
   * 
   * @param {Object} rawDoc - Lean Mongoose document
   * @returns {RoomEntity|null}
   */
  static toDomain(rawDoc) {
    if (!rawDoc) return null;
    
    return new RoomEntity({
      id: rawDoc._id?.toString() || rawDoc.id,
      code: rawDoc.code,
      name: rawDoc.name,
      owner: rawDoc.owner?.toString() || rawDoc.owner,
      isActive: rawDoc.isActive,
      maxParticipants: rawDoc.maxParticipants,
      settings: rawDoc.settings
    });
  }

  /**
   * Maps a Domain Entity back to a Persistence format.
   * 
   * @param {RoomEntity} entity 
   * @returns {Object}
   */
  static toPersistence(entity) {
    return {
      code: entity.code,
      name: entity.name,
      owner: entity.ownerId,
      isActive: entity.isActive,
      maxParticipants: entity.maxParticipants,
      settings: entity.settings
    };
  }
}

module.exports = RoomMapper;
