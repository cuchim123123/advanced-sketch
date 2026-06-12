/**
 * Room Repository
 * Infrastructure Adapter for Mongoose Room models
 */
const { Room } = require('../../../../models');
const RoomMapper = require('./mappers/room.mapper');

class RoomRepository {
  async findByCode(roomCode) {
    const room = await Room.findOne({ code: roomCode }).lean();
    return RoomMapper.toDomain(room);
  }

  async updateLastActive(roomCode) {
    await Room.updateOne({ code: roomCode }, { lastActiveAt: new Date() });
  }
}

module.exports = RoomRepository;
