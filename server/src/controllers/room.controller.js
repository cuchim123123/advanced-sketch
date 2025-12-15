/**
 * Room Controller
 * Handles room HTTP requests
 */

const roomService = require('../services/room.service');
const asyncHandler = require('../middleware/asyncHandler');
const { success, created } = require('../utils/response.util');
const { UnauthorizedError } = require('../utils');

/**
 * Create a new room
 * POST /api/rooms
 */
exports.createRoom = asyncHandler(async (req, res) => {
  const room = await roomService.createRoom(req.user._id, req.body);

  res.status(201).json(created({
    room: {
      id: room._id,
      name: room.name,
      code: room.code,
      isPublic: room.isPublic,
      maxParticipants: room.maxParticipants,
      canvasSettings: room.canvasSettings,
      inviteLink: room.getInviteLink(process.env.CLIENT_URL || 'http://localhost:3000')
    }
  }));
});

/**
 * Get user's rooms
 * GET /api/rooms
 */
exports.getUserRooms = asyncHandler(async (req, res) => {
  const rooms = await roomService.getRoomsByOwner(req.user._id);
  res.json(success({ rooms }));
});

/**
 * Get all public rooms
 * GET /api/rooms/public
 */
exports.getPublicRooms = asyncHandler(async (req, res) => {
  const rooms = await roomService.getPublicRooms();
  res.json(success({ rooms }));
});

/**
 * Get room by code
 * GET /api/rooms/:code
 */
exports.getRoomByCode = asyncHandler(async (req, res) => {
  const room = await roomService.getRoomByCode(req.params.code);

  // If room is private, require authentication or guest with invite link
  if (!room.isPublic && !req.user && !req.isGuest) {
    throw new UnauthorizedError('Please login to access this room');
  }

  res.json(success({
    room: {
      id: room._id,
      name: room.name,
      code: room.code,
      owner: room.owner,
      isPublic: room.isPublic,
      isPasswordProtected: !!room.password,
      maxParticipants: room.maxParticipants,
      canvasSettings: room.canvasSettings,
      isOwner: req.user ? room.owner._id.toString() === req.user._id.toString() : false
    }
  }));
});

/**
 * Join a room
 * POST /api/rooms/:code/join
 */
exports.joinRoom = asyncHandler(async (req, res) => {
  const room = await roomService.getRoomByCode(req.params.code);

  // Private rooms require authentication or guest with invite link
  if (!room.isPublic && !req.user && !req.isGuest) {
    throw new UnauthorizedError('Please login to join this private room');
  }

  const validatedRoom = await roomService.joinRoom(req.params.code);

  res.json(success({
    room: {
      id: validatedRoom._id,
      name: validatedRoom.name,
      code: validatedRoom.code,
      isPublic: validatedRoom.isPublic,
      canvasSettings: validatedRoom.canvasSettings
    }
  }));
});

/**
 * Update room settings
 * PUT /api/rooms/:code
 */
exports.updateRoom = asyncHandler(async (req, res) => {
  const room = await roomService.updateRoom(
    req.params.code,
    req.user._id,
    req.body
  );

  res.json(success({
    room: {
      id: room._id,
      name: room.name,
      code: room.code,
      isPublic: room.isPublic,
      maxParticipants: room.maxParticipants
    }
  }));
});

/**
 * Get room history
 * GET /api/rooms/:code/history
 */
exports.getRoomHistory = asyncHandler(async (req, res) => {
  const history = await roomService.getRoomHistory(
    req.params.code,
    req.user._id
  );

  res.json(success({ history }));
});

/**
 * Delete a room
 * DELETE /api/rooms/:code
 */
exports.deleteRoom = asyncHandler(async (req, res) => {
  const result = await roomService.deleteRoom(req.params.code, req.user._id);
  res.json(success(result));
});
