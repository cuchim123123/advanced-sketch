/**
 * Sync Stroke Command Handler
 * Processes an incoming `draw:stroke` event.
 */
const StrokeEntity = require('../../domain/stroke.entity');
const { processIncomingStroke } = require('../../../../libs/stroke-optimization.lib');

class SyncStrokeHandler {
  /**
   * @param {Object} stateAdapter - ISketchStatePort
   * @param {Object} eventPublisher - IEventPublisherPort
   * @param {Object} autoSaveAdapter - ISnapshotPort
   */
  constructor(stateAdapter, eventPublisher, autoSaveAdapter) {
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.autoSaveAdapter = autoSaveAdapter;
  }

  /**
   * @param {Object} payload
   * @param {string} payload.roomId
   * @param {Object} payload.strokeData
   * @param {boolean} payload.isPreview
   * @param {Object} payload.user - { id, username }
   * @param {string} payload.socketId
   */
  async execute({ roomId, strokeData, isPreview, user, socketId }) {
    const sketch = await this.stateAdapter.getSketch(roomId);
    if (!sketch) return;

    // Handle Preview Stroke (Optimized fast-path, bypassing domain sequence allocation)
    if (isPreview) {
      if (!strokeData || !strokeData.id || !strokeData.tool) return;
      
      const payload = {
        stroke: { ...strokeData, userId: user.id },
        username: user.username,
        isPreview: true
      };

      // In real Kafka architecture, preview strokes might not go to Kafka due to volume,
      // but for now we publish it.
      this.eventPublisher.publishToRoom(roomId, 'draw:stroke', payload, socketId);
      return;
    }

    // 1. Domain Validation
    const strokeEntity = new StrokeEntity(strokeData);
    
    // 2. Decompression (if needed)
    const decompressedData = processIncomingStroke(strokeEntity.toJSON());
    const finalStrokeEntity = new StrokeEntity(decompressedData);

    // 3. Domain Logic: Add Stroke to Sketch (LWW sequence generation)
    const processedStroke = sketch.addStroke(finalStrokeEntity, user.id);

    // 4. Persistence
    await this.stateAdapter.saveSketch(sketch);

    // 5. Publish Domain Event
    this.eventPublisher.publishToRoom(roomId, 'draw:stroke', {
      stroke: processedStroke,
      username: user.username,
      isPreview: false
    }, socketId);

    // 6. Trigger Auto-Save Side Effect
    if (this.autoSaveAdapter) {
      this.autoSaveAdapter.markDirty(roomId, this.stateAdapter);
    }

    return processedStroke;
  }
}

module.exports = SyncStrokeHandler;
