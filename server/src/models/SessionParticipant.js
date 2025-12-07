const mongoose = require('mongoose');

/**
 * Session Participant Schema - Track active users in rooms
 */
const sessionParticipantSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'editor', 'viewer'],
    default: 'editor'
  },
  cursor: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    visible: { type: Boolean, default: true }
  },
  color: {
    type: String,
    default: () => {
      // Generate random color for cursor
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for room + user
sessionParticipantSchema.index({ room: 1, user: 1 }, { unique: true });
sessionParticipantSchema.index({ socketId: 1 });

// Update lastActiveAt on cursor movement
sessionParticipantSchema.methods.updateActivity = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

module.exports = mongoose.model('SessionParticipant', sessionParticipantSchema);
