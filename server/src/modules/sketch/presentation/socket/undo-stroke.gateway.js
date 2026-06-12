/**
 * Undo Stroke Gateway
 */
class UndoStrokeGateway {
  constructor(undoStrokeHandler) {
    this.handler = undoStrokeHandler;
  }

  async handle(socket) {
    try {
      if (!socket.roomCode) return;

      await this.handler.execute({
        roomId: socket.roomCode,
        userId: socket.user._id?.toString() || socket.user.id,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = UndoStrokeGateway;
