/**
 * Room Entity
 * Aggregate Root for managing room lifecycles and participants.
 */
class RoomEntity {
  constructor(roomData) {
    this.id = roomData._id || roomData.id;
    this.code = roomData.code;
    this.name = roomData.name;
    this.ownerId = roomData.owner?.toString() || roomData.owner;
    this.isActive = roomData.isActive;
    this.maxParticipants = roomData.maxParticipants || 50;
    this.settings = roomData.settings || {};
  }

  /**
   * Checks if a new user can join the room.
   */
  canJoin(currentParticipantCount) {
    if (!this.isActive) {
      throw new Error('Room is no longer active');
    }
    
    if (currentParticipantCount >= this.maxParticipants) {
      throw new Error('Room is full');
    }
    
    return true;
  }

  /**
   * Checks if the user is the owner of the room.
   */
  isOwner(userId) {
    return this.ownerId === userId;
  }

  /**
   * Validates if a kick operation is allowed.
   */
  canKickUser(kickerId, targetId) {
    if (!this.isOwner(kickerId)) {
      throw new Error('Only room owner can kick users');
    }
    
    if (kickerId === targetId) {
      throw new Error('Cannot kick yourself');
    }
    
    if (this.ownerId === targetId) {
      throw new Error('Cannot kick room owner');
    }

    return true;
  }

  /**
   * Validates if a snapshot can be created.
   */
  canCreateSnapshot(userId, name) {
    if (!this.isOwner(userId)) {
      throw new Error('Only room owner can create snapshots');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Snapshot name is required');
    }

    return true;
  }

  /**
   * Validates if a snapshot can be restored.
   */
  canRestoreSnapshot(userId) {
    if (!this.isOwner(userId)) {
      throw new Error('Only room owner can restore snapshots');
    }
    return true;
  }
}

module.exports = RoomEntity;
