/**
 * Create Snapshot Handler
 */
const { SketchHistory } = require('../../../../models');

class CreateSnapshotHandler {
  constructor(roomRepository, stateAdapter, eventPublisher) {
    this.roomRepository = roomRepository;
    this.stateAdapter = stateAdapter;
    this.eventPublisher = eventPublisher;
    this.MAX_SNAPSHOT_NAME_LENGTH = 24;
  }

  async execute({ roomCode, name, userId, username, socketId }) {
    const room = await this.roomRepository.findByCode(roomCode);
    if (!room) throw new Error('Room not found');

    // Domain validation
    room.canCreateSnapshot(userId, name);

    const sketch = await this.stateAdapter.getSketch(roomCode);
    if (!sketch) throw new Error('Room state not found');

    const trimmedName = name.trim().slice(0, this.MAX_SNAPSHOT_NAME_LENGTH);

    // Get latest version
    const latestHistory = await SketchHistory.findOne({ room: room.id })
      .sort({ version: -1 })
      .lean();
    
    const newVersion = (latestHistory?.version || 0) + 1;

    // Create Snapshot
    await SketchHistory.create({
      room: room.id,
      version: newVersion,
      strokes: sketch.strokes || [],
      name: trimmedName,
      createdBy: userId,
      createdAt: new Date()
    });

    sketch.version = newVersion;
    await this.stateAdapter.saveSketch(sketch);

    this.eventPublisher.publishToRoom(roomCode, 'room:snapshotCreated', {
      version: newVersion,
      name: trimmedName,
      createdBy: username,
      createdAt: new Date().toISOString()
    });

    this.eventPublisher.publishToUser(socketId, 'room:snapshotSuccess', {
      message: 'Snapshot created successfully',
      version: newVersion
    });
  }
}

module.exports = CreateSnapshotHandler;
