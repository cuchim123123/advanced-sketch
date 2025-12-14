const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth.middleware')
const { User, Room, SketchHistory, SessionParticipant, OTP } = require('../models')
const { deleteRoomState, cleanupRoomGuests } = require('../socket/roomState')

// Admin middleware - check if user is admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    })
  }
  next()
}

// Get user stats
router.get('/users/stats', protect, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const guestUsers = await User.countDocuments({ isGuest: true })

    res.json({
      success: true,
      data: {
        total: totalUsers,
        guests: guestUsers,
        registered: totalUsers - guestUsers
      }
    })
  } catch (error) {
    console.error('Get user stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user stats'
    })
  }
})

// Get all users with pagination
router.get('/users', protect, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const search = req.query.search || ''

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {}

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const total = await User.countDocuments(query)

    res.json({
      success: true,
      data: {
        users,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    })
  }
})

// Delete user
router.delete('/users/:userId', protect, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      })
    }

    const user = await User.findByIdAndDelete(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Delete user's rooms and related data
    const userRooms = await Room.find({ owner: userId })
    for (const room of userRooms) {
      deleteRoomState(room.code)
      cleanupRoomGuests(room.code)
      await SketchHistory.deleteMany({ room: room._id })
      await SessionParticipant.deleteMany({ room: room._id })
    }
    await Room.deleteMany({ owner: userId })

    // Remove user from all rooms they participated in
    await Room.updateMany(
      { participants: userId },
      { $pull: { participants: userId } }
    )
    
    // Clean up OTPs
    await OTP.deleteMany({ email: user.email })

    res.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    })
  }
})

// Get room stats
router.get('/rooms/stats', protect, adminMiddleware, async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments()
    
    // Count rooms with active participants using SessionParticipant
    const roomsWithParticipants = await SessionParticipant.distinct('room', { isActive: true })
    const activeRooms = roomsWithParticipants.length

    res.json({
      success: true,
      data: {
        total: totalRooms,
        active: activeRooms,
        inactive: totalRooms - activeRooms
      }
    })
  } catch (error) {
    console.error('Get room stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get room stats'
    })
  }
})

// Get all rooms with pagination
router.get('/rooms', protect, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const search = req.query.search || ''

    const query = search
      ? { name: { $regex: search, $options: 'i' } }
      : {}

    const rooms = await Room.find(query)
      .populate('owner', 'username email')
      .populate('participants', 'username')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const total = await Room.countDocuments(query)

    res.json({
      success: true,
      data: {
        rooms,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
      }
    })
  } catch (error) {
    console.error('Get rooms error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms'
    })
  }
})

// Delete room
router.delete('/rooms/:roomId', protect, adminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params

    const room = await Room.findById(roomId)

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      })
    }

    // Clean up in-memory state
    deleteRoomState(room.code)
    cleanupRoomGuests(room.code)
    
    // Clean up related database records
    await Promise.all([
      SketchHistory.deleteMany({ room: room._id }),
      SessionParticipant.deleteMany({ room: room._id }),
      Room.findByIdAndDelete(roomId)
    ])

    res.json({
      success: true,
      message: 'Room deleted successfully'
    })
  } catch (error) {
    console.error('Delete room error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete room'
    })
  }
})

module.exports = router
