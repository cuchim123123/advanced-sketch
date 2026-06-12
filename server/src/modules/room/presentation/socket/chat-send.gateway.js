/**
 * Chat Send Gateway
 */
class ChatSendGateway {
  constructor(chatSendHandler) {
    this.handler = chatSendHandler;
  }

  async handle(socket, payload) {
    try {
      if (!socket.roomCode) return;
      const { message } = payload || {};

      await this.handler.execute({
        roomCode: socket.roomCode,
        message,
        user: socket.user
      });
    } catch (error) {
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  }
}

module.exports = ChatSendGateway;
