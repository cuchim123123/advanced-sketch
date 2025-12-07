const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters']
  },
  code: {
    type: String,
    unique: true,
    default: () => uuidv4().substring(0, 8).toUpperCase()
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  password: {
    type: String,
    default: null // null means public room
  },
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 10,
    min: 2,
    max: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  canvasSettings: {
    width: { type: Number, default: 1920 },
    height: { type: Number, default: 1080 },
    backgroundColor: { type: String, default: '#ffffff' }
  },
  createdAt: {
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

// Generate invite link
roomSchema.methods.getInviteLink = function(baseUrl) {
  return `${baseUrl}/join/${this.code}`;
};

// Index for faster lookups (code index is already created by unique: true)
roomSchema.index({ owner: 1 });

module.exports = mongoose.model('Room', roomSchema);
