/**
 * Create Snapshot Gateway
 */
class CreateSnapshotGateway {
  constructor(createSnapshotHandler) {
    this.handler = createSnapshotHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;
      const { name } = payload || {};

      await this.handler.execute({
        roomCode: socket.roomCode,
        name,
        userId: socket.user._id?.toString() || socket.user.id,
        username: socket.user.username,
        socketId: socket.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message || 'Failed to create snapshot' });
    }
  }
}

module.exports = CreateSnapshotGateway;
