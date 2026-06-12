/**
 * Disconnect Gateway
 */
class DisconnectGateway {
  constructor(disconnectHandler) {
    this.handler = disconnectHandler;
  }

  async handle(socket) {
    try {
      await this.handler.execute({
        socketId: socket.id,
        roomCode: socket.roomCode,
        user: socket.user,
        isGuest: !!socket.isGuest
      });
    } catch (error) {
      console.error('[DisconnectGateway] Error:', error);
    }
  }
}

module.exports = DisconnectGateway;
