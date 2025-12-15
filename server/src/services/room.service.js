/**
 * Room Service
 * Business logic for room operations
 */

const { Room, SketchHistory, SessionParticipant } = require('../models');
const { getGuestCount, deleteRoomState, cleanupRoomGuests } = require('../socket/roomState');
const { ROOM } = require('../config/constants');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils');

// =============================================================================
// ROOM CRUD
// =============================================================================

/**
 * Create a new room
 */
const createRoom = async (userId, data) => {
  const { name, maxParticipants, canvasSettings, isPublic } = data;

  const room = await Room.createWithRetry({
    name,
    owner: userId,
    maxParticipants: maxParticipants || ROOM.DEFAULT_MAX_PARTICIPANTS,
    isPublic: isPublic || false,
    ...(canvasSettings && { canvasSettings })
  });

  // Initialize sketch history
  await SketchHistory.create({
    room: room._id,
    version: 1,
    strokes: [],
    createdBy: userId
  });

  return room;
};

/**
 * Get rooms owned by user
 */
const getRoomsByOwner = async (userId) => {
  const rooms = await Room.find({ owner: userId })
    .sort({ lastActiveAt: -1 })
    .select('name code isPublic maxParticipants lastActiveAt createdAt isActive')
    .lean();

  return Promise.all(rooms.map(async (room) => ({
    id: room._id,
    name: room.name,
    code: room.code,
    isPublic: room.isPublic,
    maxParticipants: room.maxParticipants,
    participantCount: await getParticipantCount(room._id, room.code),
    lastActiveAt: room.lastActiveAt,
    createdAt: room.createdAt,
    isOwner: true
  })));
};

/**
 * Get public rooms
 */
const getPublicRooms = async () => {
  const rooms = await Room.find({ isPublic: true, isActive: true })
    .populate('owner', 'username')
    .sort({ createdAt: -1 })
    .select('-password')
    .lean();

  return Promise.all(rooms.map(async (room) => ({
    id: room._id,
    name: room.name,
    code: room.code,
    owner: room.owner,
    isPublic: room.isPublic,
    maxParticipants: room.maxParticipants,
    participantCount: await getParticipantCount(room._id, room.code),
    createdAt: room.createdAt
  })));
};

/**
 * Search rooms by name (public rooms only)
 */
const searchRooms = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return getPublicRooms();
  }

  const rooms = await Room.find({
    isPublic: true,
    isActive: true,
    name: { $regex: searchTerm.trim(), $options: 'i' }
  })
    .populate('owner', 'username')
    .sort({ lastActiveAt: -1 })
    .select('-password')
    .lean();

  return Promise.all(rooms.map(async (room) => ({
    id: room._id,
    name: room.name,
    code: room.code,
    owner: room.owner,
    isPublic: room.isPublic,
    maxParticipants: room.maxParticipants,
    participantCount: await getParticipantCount(room._id, room.code),
    lastActiveAt: room.lastActiveAt,
    createdAt: room.createdAt
  })));
};

/**
 * Get room by code
 */
const getRoomByCode = async (code) => {
  const room = await Room.findOne({ code })
    .populate('owner', 'username avatar');

  if (!room) {
    throw new NotFoundError('Room not found');
  }

  return room;
};

/**
 * Join room - validates capacity
 */
const joinRoom = async (code) => {
  const room = await Room.findOne({ code });

  if (!room) {
    throw new NotFoundError('Room not found');
  }

  if (!room.isActive) {
    throw new BadRequestError('Room is no longer active');
  }

  const count = await SessionParticipant.countDocuments({
    room: room._id,
    isActive: true
  });

  if (count >= room.maxParticipants) {
    throw new BadRequestError('Room is full');
  }

  return room;
};

/**
 * Update room settings
 */
const updateRoom = async (code, userId, updates) => {
  const room = await Room.findOne({ code });

  if (!room) {
    throw new NotFoundError('Room not found');
  }

  if (room.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized to update this room');
  }

  const { name, isPublic, maxParticipants } = updates;

  if (name !== undefined) room.name = name;
  if (isPublic !== undefined) room.isPublic = isPublic;
  if (maxParticipants !== undefined) {
    room.maxParticipants = Math.min(ROOM.MAX_PARTICIPANTS, Math.max(ROOM.MIN_PARTICIPANTS, maxParticipants));
  }

  await room.save();
  return room;
};

/**
 * Get room history
 */
const getRoomHistory = async (code, userId) => {
  const room = await Room.findOne({ code });

  if (!room) {
    throw new NotFoundError('Room not found');
  }

  if (room.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('Only room owner can view history');
  }

  const history = await SketchHistory.find({ room: room._id })
    .sort({ version: -1 })
    .limit(20)
    .select('version name createdAt createdBy')
    .populate('createdBy', 'username')
    .lean();

  return history.map(h => ({
    version: h.version,
    name: h.name || `Snapshot ${h.version}`,
    createdAt: h.createdAt,
    createdBy: h.createdBy?.username || 'Unknown'
  }));
};

/**
 * Delete room and related data
 */
const deleteRoom = async (code, userId) => {
  const room = await Room.findOne({ code });

  if (!room) {
    throw new NotFoundError('Room not found');
  }

  if (room.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized to delete this room');
  }

  await cleanupRoom(room);

  return { message: 'Room deleted successfully' };
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get participant count (DB + guests)
 */
const getParticipantCount = async (roomId, roomCode) => {
  const dbCount = await SessionParticipant.countDocuments({
    room: roomId,
    isActive: true
  });
  return dbCount + getGuestCount(roomCode);
};

/**
 * Cleanup room and related data
 */
const cleanupRoom = async (room) => {
  deleteRoomState(room.code);
  cleanupRoomGuests(room.code);

  await Promise.all([
    SketchHistory.deleteMany({ room: room._id }),
    SessionParticipant.deleteMany({ room: room._id }),
    room.deleteOne()
  ]);
};

module.exports = {
  createRoom,
  getRoomsByOwner,
  getPublicRooms,
  searchRooms,
  getRoomByCode,
  joinRoom,
  updateRoom,
  getRoomHistory,
  deleteRoom,
  getParticipantCount,
  cleanupRoom
};
