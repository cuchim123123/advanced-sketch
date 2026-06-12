/**
 * Reorder Strokes Command Handler
 */
class ReorderStrokesHandler {
  constructor(stateAdapter, eventPublisher, autoSaveAdapter) {
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  async execute({ roomId, strokeIds, isGuest, socketId }) {
    if (isGuest) {
      throw new Error('Only room members can reorder strokes');
    }

    const sketch = await this.stateAdapter.getSketch(roomId);
    if (!sketch) return;

    // Domain Logic
    sketch.reorder(strokeIds);

    // Persistence
    await this.stateAdapter.saveSketch(sketch);

    // Broadcast
    this.eventPublisher.publishToRoom(roomId, 'draw:reorder', { strokeIds }, socketId);

    // Trigger Auto-Save
    if (this.autoSaveAdapter) {
      this.autoSaveAdapter.markDirty(roomId, this.stateAdapter);
    }
  }
}

module.exports = ReorderStrokesHandler;
