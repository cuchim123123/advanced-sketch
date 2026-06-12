/**
 * Move Cursor Gateway
 */
class MoveCursorGateway {
  constructor(moveCursorHandler) {
    this.handler = moveCursorHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;

      const { x, y, tool } = payload || {};

      await this.handler.execute({
        roomId: socket.roomCode,
        userId: socket.user._id?.toString() || socket.user.id,
        x,
        y,
        tool,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = MoveCursorGateway;
