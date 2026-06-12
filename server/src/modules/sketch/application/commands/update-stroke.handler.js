/**
 * Update Stroke Command Handler
 */
const StrokeEntity = require('../../domain/stroke.entity');

class UpdateStrokeHandler {
  constructor(stateAdapter, eventPublisher, autoSaveAdapter) {
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  async execute({ roomId, strokeData, isPreview, socketId }) {
    const sketch = await this.stateAdapter.getSketch(roomId);
    if (!sketch) return;

    // Validate
    const strokeEntity = new StrokeEntity(strokeData);

    if (isPreview) {
      this.eventPublisher.publishToRoom(roomId, 'draw:update', { 
        stroke: strokeData, 
        isPreview: true 
      }, socketId);
      return;
    }

    // Domain Logic: Update stroke
    const updatedStroke = sketch.updateStroke(strokeEntity);

    // Persistence
    await this.stateAdapter.saveSketch(sketch);

    // Broadcast
    this.eventPublisher.publishToRoom(roomId, 'draw:update', { 
      stroke: updatedStroke,
      isPreview: false
    }, socketId);

    // Trigger Auto-Save
    if (this.autoSaveAdapter) {
      this.autoSaveAdapter.markDirty(roomId, this.stateAdapter);
    }
  }
}

module.exports = UpdateStrokeHandler;
