/**
 * Socket.io Event Publisher Adapter
 * Implements IEventPublisherPort
 * 
 * Responsible for publishing domain events to connected clients.
 * Abstracted to easily swap to Kafka Producer in the future.
 */

class SocketEventPublisher {
  constructor(io) {
    this.io = io;
  }

  /**
   * Publish an event to a specific room
   * @param {string} roomCode - The target room
   * @param {string} event - The event name
   * @param {Object} payload - The event data
   * @param {string} [excludeSocketId] - Optional socket ID to exclude from broadcast
   */
  publishToRoom(roomCode, event, payload, excludeSocketId = null) {
    if (!this.io) {
      console.warn('[EventPublisher] Socket.io instance not injected');
      return;
    }

    if (excludeSocketId) {
      // Get the socket instance
      const socket = this.io.sockets.sockets.get(excludeSocketId);
      if (socket) {
        socket.to(roomCode).emit(event, payload);
      } else {
        // Fallback if socket not found locally (in a distributed env, this adapter will be replaced)
        this.io.to(roomCode).emit(event, payload);
      }
    } else {
      this.io.to(roomCode).emit(event, payload);
    }
  }

  /**
   * Publish an event to a specific user/socket
   */
  publishToUser(socketId, event, payload) {
    if (this.io) {
      this.io.to(socketId).emit(event, payload);
    }
  }
}

module.exports = SocketEventPublisher;
