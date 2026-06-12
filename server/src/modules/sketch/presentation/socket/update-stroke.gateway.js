/**
 * Update Stroke Gateway
 */
class UpdateStrokeGateway {
  constructor(updateStrokeHandler) {
    this.handler = updateStrokeHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;
      
      const { stroke, isPreview } = payload || {};
      if (!stroke) return;

      await this.handler.execute({
        roomId: socket.roomCode,
        strokeData: stroke,
        isPreview: !!isPreview,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = UpdateStrokeGateway;
