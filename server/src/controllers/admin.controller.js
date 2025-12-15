/**
 * Admin Controller
 * Handles admin HTTP requests
 */

const adminService = require('../services/admin.service');
const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/response.util');

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Get user statistics
 * GET /api/admin/users/stats
 */
exports.getUserStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getUserStats();
  res.json(success(stats));
});

/**
 * Get all users with pagination
 * GET /api/admin/users
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';

  const result = await adminService.getUsers({ page, limit, search });
  res.json(success(result));
});

/**
 * Delete a user
 * DELETE /api/admin/users/:userId
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const result = await adminService.deleteUser(req.params.userId, req.user.id);
  res.json(success(result));
});

// =============================================================================
// ROOM MANAGEMENT
// =============================================================================

/**
 * Get room statistics
 * GET /api/admin/rooms/stats
 */
exports.getRoomStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getRoomStats();
  res.json(success(stats));
});

/**
 * Get all rooms with pagination
 * GET /api/admin/rooms
 */
exports.getRooms = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';

  const result = await adminService.getRooms({ page, limit, search });
  res.json(success(result));
});

/**
 * Delete a room
 * DELETE /api/admin/rooms/:roomId
 */
exports.deleteRoom = asyncHandler(async (req, res) => {
  const result = await adminService.deleteRoom(req.params.roomId);
  res.json(success(result));
});
