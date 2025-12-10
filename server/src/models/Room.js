const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Generate unique room code with collision check
const generateRoomCode = () => uuidv4().substring(0, 8).toUpperCase();

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
    default: generateRoomCode
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false // false = private (joinable only via link/code), true = visible to everyone
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

const Room = mongoose.model('Room', roomSchema);

// Static method to create room with retry on code collision
Room.createWithRetry = async function(roomData, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const room = await Room.create({
        ...roomData,
        code: generateRoomCode()
      });
      return room;
    } catch (error) {
      // If duplicate key error on 'code', retry with new code
      if (error.code === 11000 && error.keyPattern?.code) {
        console.log(`Room code collision, retrying... (${i + 1}/${maxRetries})`);
        continue;
      }
      // Other errors, throw immediately
      throw error;
    }
  }
  throw new Error('Failed to generate unique room code after max retries');
};

module.exports = Room;
