/**
 * Move Cursor Command Handler
 * This is an ephemeral event that doesn't need to touch the domain state or persistence.
 * It strictly acts as a pass-through to the event publisher.
 */
class MoveCursorHandler {
  constructor(eventPublisher) {
    this.eventPublisher = eventPublisher;
  }

  execute({ roomId, userId, x, y, tool, socketId }) {
    this.eventPublisher.publishToRoom(roomId, 'cursor:move', {
      userId,
      x,
      y,
      tool
    }, socketId);
  }
}

module.exports = MoveCursorHandler;
