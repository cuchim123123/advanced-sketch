/**
 * Restore Snapshot Gateway
 */
class RestoreSnapshotGateway {
  constructor(restoreSnapshotHandler) {
    this.handler = restoreSnapshotHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;
      const { version } = payload || {};

      await this.handler.execute({
        roomCode: socket.roomCode,
        version,
        userId: socket.user._id?.toString() || socket.user.id
      });
    } catch (error) {
      socket.emit('error', { message: error.message || 'Failed to restore snapshot' });
    }
  }
}

module.exports = RestoreSnapshotGateway;
