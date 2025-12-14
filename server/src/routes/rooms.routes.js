const express = require('express');
const { Room, SketchHistory, SessionParticipant } = require('../models');
const { protect, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { name, maxParticipants, canvasSettings, isPublic } = req.body;

    const roomData = {
      name,
      owner: req.user._id,
      maxParticipants: maxParticipants || 10,
      isPublic: isPublic || false
    };

    if (canvasSettings) {
      roomData.canvasSettings = canvasSettings;
    }

    // Use createWithRetry to handle potential code collisions
    const room = await Room.createWithRetry(roomData);

    // Create initial empty sketch history
    await SketchHistory.create({
      room: room._id,
      version: 1,
      strokes: [],
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: {
        room: {
          id: room._id,
          name: room.name,
          code: room.code,
          isPublic: room.isPublic,
          maxParticipants: room.maxParticipants,
          canvasSettings: room.canvasSettings,
          inviteLink: room.getInviteLink(process.env.CLIENT_URL || 'http://localhost:3000')
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/rooms
 * @desc    Get user's rooms
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user._id })
      .sort({ lastActiveAt: -1 })
      .select('name code isPublic maxParticipants lastActiveAt createdAt isActive');

    // Get participant counts for each room
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const participantCount = await SessionParticipant.countDocuments({
          room: room._id,
          isActive: true
        });
        return {
          id: room._id,
          name: room.name,
          code: room.code,
          isPublic: room.isPublic,
          maxParticipants: room.maxParticipants,
          participantCount,
          lastActiveAt: room.lastActiveAt,
          createdAt: room.createdAt,
          isOwner: true
        };
      })
    );

    res.json({
      success: true,
      data: { rooms: roomsWithCounts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/rooms/public
 * @desc    Get all public rooms
 * @access  Public (no auth required)
 */
router.get('/public', async (req, res) => {
  try {
    const rooms = await Room.find({ isPublic: true, isActive: true })
      .populate('owner', 'username')
      .sort({ createdAt: -1 })
      .select('-password');

    // Get participant counts for each room
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const participantCount = await SessionParticipant.countDocuments({
          room: room._id,
          isActive: true
        });
        return {
          id: room._id,
          name: room.name,
          code: room.code,
          owner: room.owner,
          isPublic: room.isPublic,
          maxParticipants: room.maxParticipants,
          participantCount,
          createdAt: room.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: { rooms: roomsWithCounts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/rooms/:code
 * @desc    Get room by code
 * @access  Public for public rooms, Private for private rooms
 */
router.get('/:code', optionalAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code })
      .populate('owner', 'username avatar');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // If room is private, require authentication or guest with invite link
    // Guests can join private rooms via direct invite link
    if (!room.isPublic && !req.user && !req.isGuest) {
      return res.status(401).json({
        success: false,
        message: 'Please login to access this room'
      });
    }

    res.json({
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/rooms/:code/join
 * @desc    Join a room
 * @access  Public for public rooms, Private for private rooms
 */
router.post('/:code/join', optionalAuth, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (!room.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Room is no longer active'
      });
    }

    // Private rooms require authentication or guest with invite link
    // Guests can join private rooms via direct invite link
    if (!room.isPublic && !req.user && !req.isGuest) {
      return res.status(401).json({
        success: false,
        message: 'Please login to join this private room'
      });
    }

    // Get participant count
    const participantCount = await SessionParticipant.countDocuments({
      room: room._id,
      isActive: true
    });

    if (participantCount >= room.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Room is full'
      });
    }

    res.json({
      success: true,
      data: {
        room: {
          id: room._id,
          name: room.name,
          code: room.code,
          isPublic: room.isPublic,
          canvasSettings: room.canvasSettings
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PATCH /api/rooms/:code
 * @desc    Update room settings (owner only)
 * @access  Private
 */
router.patch('/:code', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this room'
      });
    }

    const { name, isPublic, maxParticipants } = req.body;

    // Update name
    if (name !== undefined) {
      room.name = name;
    }

    // Update visibility
    if (isPublic !== undefined) {
      room.isPublic = isPublic;
    }

    // Update max participants
    if (maxParticipants !== undefined) {
      room.maxParticipants = Math.min(50, Math.max(2, maxParticipants));
    }

    await room.save();

    res.json({
      success: true,
      data: {
        room: {
          id: room._id,
          name: room.name,
          code: room.code,
          isPublic: room.isPublic,
          maxParticipants: room.maxParticipants
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/rooms/:code/history
 * @desc    Get snapshot history for a room (owner only)
 * @access  Private
 */
router.get('/:code/history', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Only owner can view history
    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only room owner can view history'
      });
    }

    const history = await SketchHistory.find({ room: room._id })
      .sort({ version: -1 })
      .limit(20)
      .select('version createdAt createdBy')
      .populate('createdBy', 'username');

    res.json({
      success: true,
      data: {
        history: history.map(h => ({
          version: h.version,
          createdAt: h.createdAt,
          createdBy: h.createdBy?.username || 'Unknown'
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/rooms/:code
 * @desc    Delete a room (owner only)
 * @access  Private
 */
router.delete('/:code', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this room'
      });
    }

    // Delete related data
    await SketchHistory.deleteMany({ room: room._id });
    await SessionParticipant.deleteMany({ room: room._id });
    await room.deleteOne();

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
