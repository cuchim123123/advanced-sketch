/**
 * Kick User Gateway
 */
class KickUserGateway {
  constructor(kickUserHandler, io) {
    this.handler = kickUserHandler;
    this.io = io;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;
      const { targetUserId } = payload || {};

      const targetSocketId = await this.handler.execute({
        roomCode: socket.roomCode,
        kickerId: socket.user._id?.toString() || socket.user.id,
        targetId: targetUserId
      });

      // Force socket to leave room if found locally
      if (this.io) {
        const targetSocket = this.io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(socket.roomCode);
          targetSocket.roomCode = null;
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message || 'Failed to kick user' });
    }
  }
}

module.exports = KickUserGateway;
