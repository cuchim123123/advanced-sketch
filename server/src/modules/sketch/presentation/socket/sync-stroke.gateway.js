/**
 * Sync Stroke Gateway
 * Primary Adapter for the 'draw:stroke' WebSocket event.
 */
class SyncStrokeGateway {
  constructor(syncStrokeHandler) {
    this.handler = syncStrokeHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;
      
      const { stroke, isPreview } = payload || {};

      await this.handler.execute({
        roomId: socket.roomCode,
        strokeData: stroke,
        isPreview: !!isPreview,
        user: {
          id: socket.user._id?.toString() || socket.user.id,
          username: socket.user.username
        },
        socketId: socket.id
      });
    } catch (error) {
      // In a real socket controller, we'd log or emit an error back
      socket.emit('error', { message: error.message });
    }
  }
}

module.exports = SyncStrokeGateway;
