const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const roomController = require('../controllers/room.controller');

const router = express.Router();

// =============================================================================
// ROOM ROUTES
// =============================================================================

/**
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private
 */
router.post('/', protect, roomController.createRoom);

/**
 * @route   GET /api/rooms
 * @desc    Get user's rooms
 * @access  Private
 */
router.get('/', protect, roomController.getUserRooms);

/**
 * @route   GET /api/rooms/public
 * @desc    Get all public rooms
 * @access  Public
 */
router.get('/public', roomController.getPublicRooms);

/**
 * @route   GET /api/rooms/:code
 * @desc    Get room by code
 * @access  Public for public rooms, Private for private rooms
 */
router.get('/:code', optionalAuth, roomController.getRoomByCode);

/**
 * @route   POST /api/rooms/:code/join
 * @desc    Join a room
 * @access  Public for public rooms, Private for private rooms
 */
router.post('/:code/join', optionalAuth, roomController.joinRoom);

/**
 * @route   PATCH /api/rooms/:code
 * @desc    Update room settings (owner only)
 * @access  Private
 */
router.patch('/:code', protect, roomController.updateRoom);

/**
 * @route   GET /api/rooms/:code/history
 * @desc    Get snapshot history for a room (owner only)
 * @access  Private
 */
router.get('/:code/history', protect, roomController.getRoomHistory);

/**
 * @route   DELETE /api/rooms/:code
 * @desc    Delete a room (owner only)
 * @access  Private
 */
router.delete('/:code', protect, roomController.deleteRoom);

module.exports = router;
