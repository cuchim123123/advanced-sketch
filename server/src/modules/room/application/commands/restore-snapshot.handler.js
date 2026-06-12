/**
 * Restore Snapshot Handler
 */
const { SketchHistory } = require('../../../../models');

class RestoreSnapshotHandler {
  constructor(roomRepository, stateAdapter, eventPublisher) {
    this.roomRepository = roomRepository;
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
  }

  async execute({ roomCode, version, userId }) {
    const room = await this.roomRepository.findByCode(roomCode);
    if (!room) throw new Error('Room not found');

    // Domain validation
    room.canRestoreSnapshot(userId);

    const history = await SketchHistory.findOne({
      room: room.id,
      version: version
    }).lean();

    if (!history) throw new Error('Snapshot not found');

    const sketch = await this.stateAdapter.getSketch(roomCode);
    if (sketch) {
      sketch.strokes = history.strokes || [];
      // Also need to clear strokes map to rebuild it on save, or rebuild it here.
      sketch.strokesMap = new Map(sketch.strokes.map(s => [s.id, s]));
      
      await this.stateAdapter.saveSketch(sketch);

      this.eventPublisher.publishToRoom(roomCode, 'room:restored', {
        strokes: sketch.strokes,
        version: version
      });
    }
  }
}

module.exports = RestoreSnapshotHandler;
