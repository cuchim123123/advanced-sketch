const express = require('express');
const bcrypt = require('bcryptjs');
const { Room, SketchHistory, SessionParticipant } = require('../models');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { name, password, maxParticipants, canvasSettings } = req.body;

    const roomData = {
      name,
      owner: req.user._id,
      maxParticipants: maxParticipants || 10
    };

    // Handle optional password
    if (password) {
      roomData.password = await bcrypt.hash(password, 10);
      roomData.isPasswordProtected = true;
    }

    if (canvasSettings) {
      roomData.canvasSettings = canvasSettings;
    }

    const room = await Room.create(roomData);

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
          isPasswordProtected: room.isPasswordProtected,
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
      .select('-password');

    res.json({
      success: true,
      data: { rooms }
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
 * @access  Private
 */
router.get('/:code', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code })
      .populate('owner', 'username avatar');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
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
          isPasswordProtected: room.isPasswordProtected,
          maxParticipants: room.maxParticipants,
          canvasSettings: room.canvasSettings,
          isOwner: room.owner._id.toString() === req.user._id.toString()
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
 * @access  Private
 */
router.post('/:code/join', protect, async (req, res) => {
  try {
    const { password } = req.body;
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

    // Check password if required
    if (room.isPasswordProtected) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: 'Password required'
        });
      }

      const isMatch = await bcrypt.compare(password, room.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password'
        });
      }
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
 * @route   GET /api/rooms/:code/history
 * @desc    Get room's sketch history
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

    const latestHistory = await SketchHistory.findOne({ room: room._id })
      .sort({ version: -1 });

    res.json({
      success: true,
      data: {
        history: latestHistory
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
