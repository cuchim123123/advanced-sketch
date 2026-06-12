/**
 * Redo Stroke Command Handler
 */
class RedoStrokeHandler {
  constructor(stateAdapter, eventPublisher, autoSaveAdapter) {
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  async execute({ roomId, userId, username, socketId }) {
    const sketch = await this.stateAdapter.getSketch(roomId);
    if (!sketch) return;

    // Domain Logic: Redo stroke
    const redoneStroke = sketch.redo(userId);

    if (redoneStroke) {
      // Persistence
      await this.stateAdapter.saveSketch(sketch);

      // Broadcast Stroke
      this.eventPublisher.publishToRoom(roomId, 'draw:stroke', { 
        stroke: redoneStroke,
        username: username,
        isPreview: false
      }, socketId);

      // Trigger Auto-Save
      if (this.autoSaveAdapter) {
        this.autoSaveAdapter.markDirty(roomId, this.stateAdapter);
      }
    }
  }
}

module.exports = RedoStrokeHandler;
