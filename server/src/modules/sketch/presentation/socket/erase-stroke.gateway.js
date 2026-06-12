/**
 * Erase Stroke Gateway
 */
class EraseStrokeGateway {
  constructor(eraseStrokeHandler) {
    this.handler = eraseStrokeHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;
      
      const { strokeId } = payload || {};
      if (!strokeId) return;

      await this.handler.execute({
        roomId: socket.roomCode,
        strokeId,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = EraseStrokeGateway;
