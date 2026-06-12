/**
 * Auto-Save Adapter
 * Implements ISnapshotPort
 * 
 * Manages the persistence of sketch states to the MongoDB database (SketchHistory).
 * Designed to decouple the socket layer from the persistence layer.
 */
const { SketchHistory, Room } = require('../../../models');

class AutoSaveAdapter {
  constructor() {
    this.dirtyRooms = new Set();
    this.saveTimers = new Map();
    this.SAVE_DELAY = 2000; // 2 seconds debounce
  }

  /**
   * Marks a room as dirty and schedules a save.
   * @param {string} roomId 
   * @param {Object} statePort - Inject ISketchStatePort to fetch latest state on save
   */
  markDirty(roomId, statePort) {
    this.dirtyRooms.add(roomId);

    // Debounce logic
    if (this.saveTimers.has(roomId)) {
      clearTimeout(this.saveTimers.get(roomId));
    }

    const timer = setTimeout(() => {
      this.forceSave(roomId, statePort);
    }, this.SAVE_DELAY);

    this.saveTimers.set(roomId, timer);
  }

  /**
   * Forces an immediate save for a specific room.
   * @param {string} roomId 
   * @param {Object} statePort 
   */
  async forceSave(roomId, statePort) {
    if (this.saveTimers.has(roomId)) {
      clearTimeout(this.saveTimers.get(roomId));
      this.saveTimers.delete(roomId);
    }

    if (!this.dirtyRooms.has(roomId)) return;

    try {
      const sketch = await statePort.getSketch(roomId);
      if (!sketch || !sketch.strokes) return;

      const room = await Room.findOne({ code: roomId }).select('_id');
      if (!room) return;

      await SketchHistory.create({
        room: room._id,
        version: sketch.version + 1,
        strokes: sketch.strokes
      });

      this.dirtyRooms.delete(roomId);
    } catch (error) {
      console.error(`[AutoSaveAdapter] Failed to save room ${roomId}:`, error);
    }
  }

  /**
   * Cleans up timers for a room when shutting down or empty.
   */
  cleanup(roomId) {
    if (this.saveTimers.has(roomId)) {
      clearTimeout(this.saveTimers.get(roomId));
      this.saveTimers.delete(roomId);
    }
    this.dirtyRooms.delete(roomId);
  }
}

module.exports = AutoSaveAdapter;
