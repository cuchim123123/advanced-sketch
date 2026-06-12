/**
 * Clear Sketch Gateway
 */
class ClearSketchGateway {
  constructor(clearSketchHandler) {
    this.handler = clearSketchHandler;
  }

  async handle(socket) {
    try {
      if (!socket.roomCode) return;

      await this.handler.execute({
        roomId: socket.roomCode,
        isGuest: !!socket.isGuest,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = ClearSketchGateway;
