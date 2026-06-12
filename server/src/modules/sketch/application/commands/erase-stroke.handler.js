/**
 * Erase Stroke Command Handler
 */
class EraseStrokeHandler {
  constructor(stateAdapter, eventPublisher, autoSaveAdapter) {
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  async execute({ roomId, strokeId, socketId }) {
    const sketch = await this.stateAdapter.getSketch(roomId);
    if (!sketch) return;

    // Domain Logic: Erase stroke
    const wasDeleted = sketch.eraseStroke(strokeId);

    // Only broadcast if the stroke actually existed and was deleted
    if (wasDeleted) {
      await this.stateAdapter.saveSketch(sketch);

      this.eventPublisher.publishToRoom(roomId, 'draw:erase', { strokeId }, socketId);

      if (this.autoSaveAdapter) {
        this.autoSaveAdapter.markDirty(roomId, this.stateAdapter);
      }
    }
  }
}

module.exports = EraseStrokeHandler;
