/**
 * Clear Sketch Command Handler
 */
class ClearSketchHandler {
  constructor(stateAdapter, eventPublisher, autoSaveAdapter) {
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  async execute({ roomId, isGuest, socketId }) {
    if (isGuest) {
      throw new Error('Guests cannot clear the canvas');
    }

    const sketch = await this.stateAdapter.getSketch(roomId);
    if (!sketch) return;

    // Domain Logic
    sketch.clear();

    // Persistence
    await this.stateAdapter.saveSketch(sketch);

    // Broadcast
    this.eventPublisher.publishToRoom(roomId, 'draw:clear', null, socketId);

    // Trigger Auto-Save
    if (this.autoSaveAdapter) {
      this.autoSaveAdapter.markDirty(roomId, this.stateAdapter);
    }
  }
}

module.exports = ClearSketchHandler;
