/**
 * Join Room Gateway
 */
const JoinRoomCommandDTO = require('../../application/dtos/join-room.command');

class JoinRoomGateway {
  constructor(joinRoomHandler) {
    this.handler = joinRoomHandler;
  }

  async handle(socket, payload) {
    try {
      const { roomCode } = payload || {};
      
      const previousRoomCode = socket.roomCode;
      if (previousRoomCode && previousRoomCode !== roomCode) {
        socket.leave(previousRoomCode);
      }

      const command = new JoinRoomCommandDTO({
        roomCode,
        user: socket.user,
        socketId: socket.id,
        isGuest: !!socket.isGuest,
        previousRoomCode
      });

      const result = await this.handler.execute(command);

      // Join socket room
      socket.join(roomCode);
      socket.roomCode = roomCode;

      // Send current state to joining user
      socket.emit('room:state', result.state);

      // Notify others
      socket.to(roomCode).emit('user:joined', result.participant);

      // Broadcast to dashboard
      socket.broadcast.emit('dashboard:roomUpdate', {
        roomCode,
        participantCount: result.totalParticipants
      });
    } catch (error) {
      socket.emit('error', { message: error.message || 'Failed to join room' });
    }
  }
}

module.exports = JoinRoomGateway;
