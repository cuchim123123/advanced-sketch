/**
 * Join Room Command DTO (Local DTO)
 * Enforces the strict input requirements for the JoinRoomHandler.
 */
class JoinRoomCommandDTO {
  constructor({ roomCode, user, socketId, isGuest, previousRoomCode }) {
    if (!roomCode) throw new Error('roomCode is required to join a room');
    if (!user) throw new Error('user object is required');
    if (!socketId) throw new Error('socketId is required');

    this.roomCode = roomCode;
    this.user = {
      id: user._id?.toString() || user.id,
      username: user.username,
      avatar: user.avatar
    };
    this.socketId = socketId;
    this.isGuest = !!isGuest;
    this.previousRoomCode = previousRoomCode || null;

    Object.freeze(this);
  }
}

module.exports = JoinRoomCommandDTO;
