/**
 * Redo Stroke Gateway
 */
class RedoStrokeGateway {
  constructor(redoStrokeHandler) {
    this.handler = redoStrokeHandler;
  }

  async handle(socket) {
    try {
      if (!socket.roomCode) return;

      await this.handler.execute({
        roomId: socket.roomCode,
        userId: socket.user._id?.toString() || socket.user.id,
        username: socket.user.username,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = RedoStrokeGateway;
