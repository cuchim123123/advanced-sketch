/**
 * Undo Stroke Command Handler
 */
class UndoStrokeHandler {
  constructor(stateAdapter, eventPublisher, autoSaveAdapter) {
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  async execute({ roomId, userId, socketId }) {
    const sketch = await this.stateAdapter.getSketch(roomId);
    if (!sketch) return;

    // Domain Logic: Undo stroke
    const undoneStroke = sketch.undo(userId);

    if (undoneStroke) {
      // Persistence
      await this.stateAdapter.saveSketch(sketch);

      // Broadcast Erase
      this.eventPublisher.publishToRoom(roomId, 'draw:erase', { 
        strokeId: undoneStroke.id 
      }, socketId);

      // Trigger Auto-Save
      if (this.autoSaveAdapter) {
        this.autoSaveAdapter.markDirty(roomId, this.stateAdapter);
      }
    }
  }
}

module.exports = UndoStrokeHandler;
