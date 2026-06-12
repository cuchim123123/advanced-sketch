/**
 * Reorder Strokes Gateway
 */
class ReorderStrokesGateway {
  constructor(reorderStrokesHandler) {
    this.handler = reorderStrokesHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;

      const { strokeIds } = payload || {};

      await this.handler.execute({
        roomId: socket.roomCode,
        strokeIds,
        isGuest: !!socket.isGuest,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = ReorderStrokesGateway;
