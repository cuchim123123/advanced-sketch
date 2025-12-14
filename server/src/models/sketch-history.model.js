const mongoose = require('mongoose');

/**
 * Stroke Schema - Individual drawing stroke
 * Using stroke logs approach for better real-time sync and undo/redo support
 * Note: Using strict: false to allow any additional fields (rotation, etc.)
 */
const strokeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  userId: {
    type: String, // String to support both ObjectId and guest IDs
    required: true
  },
  tool: {
    type: String,
    // Removed enum restriction - tools can be extended and some may not be drawing tools
    default: 'pen'
  },
  points: [{
    x: Number,
    y: Number,
    pressure: { type: Number, default: 1 }
  }],
  color: {
    type: String,
    default: '#000000'
  },
  strokeWidth: {
    type: Number,
    default: 2,
    min: 1,
    max: 50
  },
  opacity: {
    type: Number,
    default: 1,
    min: 0,
    max: 1
  },
  // For shapes
  startPoint: {
    x: Number,
    y: Number
  },
  endPoint: {
    x: Number,
    y: Number
  },
  // For rotation/transform
  rotation: {
    type: Number,
    default: 0
  },
  // For images
  imageData: String,
  width: Number,
  height: Number,
  // For text
  text: String,
  fontSize: Number,
  fontFamily: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

/**
 * Sketch History Schema - Version snapshots for a room
 */
const sketchHistorySchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  version: {
    type: Number,
    required: true
  },
  strokes: [strokeSchema],
  // Snapshot for quick loading (compressed canvas state)
  snapshot: {
    type: String, // Base64 encoded image
    default: null
  },
  createdBy: {
    type: String // String to support both ObjectId and guest IDs
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for room + version
sketchHistorySchema.index({ room: 1, version: -1 });

module.exports = mongoose.model('SketchHistory', sketchHistorySchema);
