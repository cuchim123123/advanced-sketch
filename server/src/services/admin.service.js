/**
 * Admin Service
 * Business logic for admin operations
 */

const { User, Room, SketchHistory, SessionParticipant, OTP } = require('../models');
const { cleanupRoom } = require('./room.service');
const { PAGINATION } = require('../config/constants');
const { NotFoundError, BadRequestError } = require('../utils');

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Get user statistics
 */
const getUserStats = async () => {
  const [total, guests] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isGuest: true })
  ]);

  return {
    total,
    guests,
    registered: total - guests
  };
};

/**
 * Get users with pagination
 */
const getUsers = async ({ page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, search = '' }) => {
  const query = search
    ? {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(query)
  ]);

  return {
    users,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    total
  };
};

/**
 * Delete user and cascade
 */
const deleteUser = async (userId, adminUserId) => {
  if (userId === adminUserId) {
    throw new BadRequestError('Cannot delete your own account');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Cleanup user's rooms
  const userRooms = await Room.find({ owner: userId });
  await Promise.all(userRooms.map(room => cleanupRoom(room)));

  // Remove from participated rooms
  await Room.updateMany(
    { participants: userId },
    { $pull: { participants: userId } }
  );

  // Cleanup OTPs
  await OTP.deleteMany({ email: user.email });

  // Delete user
  await User.findByIdAndDelete(userId);

  return { message: 'User deleted successfully' };
};

// =============================================================================
// ROOM MANAGEMENT
// =============================================================================

/**
 * Get room statistics
 */
const getRoomStats = async () => {
  const [total, activeRoomIds] = await Promise.all([
    Room.countDocuments(),
    SessionParticipant.distinct('room', { isActive: true })
  ]);

  return {
    total,
    active: activeRoomIds.length,
    inactive: total - activeRoomIds.length
  };
};

/**
 * Get rooms with pagination
 */
const getRooms = async ({ page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT, search = '' }) => {
  const query = search
    ? { name: { $regex: search, $options: 'i' } }
    : {};

  const [rooms, total] = await Promise.all([
    Room.find(query)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Room.countDocuments(query)
  ]);

  // Add participant counts
  const roomsWithCounts = await Promise.all(
    rooms.map(async (room) => ({
      ...room,
      activeParticipants: await SessionParticipant.countDocuments({
        room: room._id,
        isActive: true
      })
    }))
  );

  return {
    rooms: roomsWithCounts,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    total
  };
};

/**
 * Delete room (admin)
 */
const deleteRoom = async (roomId) => {
  const room = await Room.findById(roomId);

  if (!room) {
    throw new NotFoundError('Room not found');
  }

  await cleanupRoom(room);

  return { message: 'Room deleted successfully' };
};

module.exports = {
  getUserStats,
  getUsers,
  deleteUser,
  getRoomStats,
  getRooms,
  deleteRoom
};
