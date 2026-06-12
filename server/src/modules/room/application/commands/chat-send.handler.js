/**
 * Chat Send Handler
 */
class ChatSendHandler {
  constructor(eventPublisher) {
    this.eventPublisher = eventPublisher;
    this.MAX_CHAT_MESSAGE_LENGTH = 1000;
  }

  sanitizeInput(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
  }

  execute({ roomCode, message, user }) {
    if (!roomCode || !message?.trim()) return;

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > this.MAX_CHAT_MESSAGE_LENGTH) {
      throw new Error(`Message too long (max ${this.MAX_CHAT_MESSAGE_LENGTH} characters)`);
    }

    const sanitizedMessage = this.sanitizeInput(trimmedMessage);

    const chatMessage = {
      message: sanitizedMessage,
      user: {
        id: user._id || user.id,
        username: this.sanitizeInput(user.username)
      },
      timestamp: new Date().toISOString()
    };

    this.eventPublisher.publishToRoom(roomCode, 'chat:message', chatMessage);
  }
}

module.exports = ChatSendHandler;
