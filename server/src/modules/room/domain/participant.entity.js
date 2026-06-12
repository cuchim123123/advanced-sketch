/**
 * Participant Entity
 * Domain representation of a user participating in a room.
 * This entity protects the boundary from Mongoose SessionParticipant documents.
 */
class ParticipantEntity {
  constructor(data) {
    this.id = data.id || data.user?._id?.toString() || data.user?.id;
    this.username = data.username || data.user?.username;
    this.avatar = data.avatar || data.user?.avatar;
    
    // Domain-specific fields
    this.isGuest = !!data.isGuest;
    this.color = data.color;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.socketId = data.socketId;
    this.cursor = data.cursor || null;
    
    // Validate identity
    if (!this.id) {
      throw new Error('Participant must have an identity (id)');
    }
  }

  deactivate() {
    this.isActive = false;
  }

  activate(socketId) {
    this.isActive = true;
    if (socketId) {
      this.socketId = socketId;
    }
  }

  updateCursor(cursorData) {
    this.cursor = cursorData;
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      avatar: this.avatar,
      isGuest: this.isGuest,
      color: this.color,
      isActive: this.isActive,
      cursor: this.cursor
    };
  }
}

module.exports = ParticipantEntity;
