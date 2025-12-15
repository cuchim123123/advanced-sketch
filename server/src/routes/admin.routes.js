const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

// =============================================================================
// ADMIN MIDDLEWARE
// =============================================================================

/**
 * Check if user is admin
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

// Apply protect + admin middleware to all routes
router.use(protect, adminOnly);

// =============================================================================
// USER ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics
 * @access  Admin
 */
router.get('/users/stats', adminController.getUserStats);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination
 * @access  Admin
 */
router.get('/users', adminController.getUsers);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user
 * @access  Admin
 */
router.delete('/users/:userId', adminController.deleteUser);

// =============================================================================
// ROOM ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/rooms/stats
 * @desc    Get room statistics
 * @access  Admin
 */
router.get('/rooms/stats', adminController.getRoomStats);

/**
 * @route   GET /api/admin/rooms
 * @desc    Get all rooms with pagination
 * @access  Admin
 */
router.get('/rooms', adminController.getRooms);

/**
 * @route   DELETE /api/admin/rooms/:roomId
 * @desc    Delete a room
 * @access  Admin
 */
router.delete('/rooms/:roomId', adminController.deleteRoom);

module.exports = router;
