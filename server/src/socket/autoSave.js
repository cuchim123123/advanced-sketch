/**
 * Auto-save service for room sketches
 * Debounced save to prevent excessive DB writes
 */
const { Room, SketchHistory } = require('../models');
const { 
  getRoomState, 
  markRoomDirty, 
  markRoomClean, 
  isRoomDirty,
  getSaveTimer,
  setSaveTimer,
  clearSaveTimer
} = require('./roomState');

// Auto-save delay (5 seconds after last change)
const AUTO_SAVE_DELAY = 5000;
// Max delay before forced save (30 seconds)
const MAX_SAVE_DELAY = 30000;

// Track when room first became dirty
const dirtyTimestamps = new Map();

/**
 * Schedule auto-save for a room (debounced with max delay)
 * Call this after any stroke change
 */
function scheduleAutoSave(roomCode) {
  // Mark room as having unsaved changes
  markRoomDirty(roomCode);
  
  // Track first dirty time
  if (!dirtyTimestamps.has(roomCode)) {
    dirtyTimestamps.set(roomCode, Date.now());
  }
  
  // Check if we've exceeded max delay
  const firstDirtyTime = dirtyTimestamps.get(roomCode);
  const timeSinceFirstDirty = Date.now() - firstDirtyTime;
  
  if (timeSinceFirstDirty >= MAX_SAVE_DELAY) {
    // Force save now, don't wait
    clearSaveTimer(roomCode);
    performAutoSave(roomCode);
    return;
  }
  
  // Clear existing timer
  clearSaveTimer(roomCode);
  
  // Schedule new save
  const timer = setTimeout(async () => {
    await performAutoSave(roomCode);
  }, AUTO_SAVE_DELAY);
  
  setSaveTimer(roomCode, timer);
}

/**
 * Perform the actual save to database
 */
async function performAutoSave(roomCode) {
  if (!isRoomDirty(roomCode)) return;
  
  // Clear dirty timestamp
  dirtyTimestamps.delete(roomCode);
  
  try {
    const room = await Room.findOne({ code: roomCode });
    const roomState = getRoomState(roomCode);
    
    if (!room || !roomState || !roomState.strokes?.length) {
      markRoomClean(roomCode);
      return;
    }
    
    // Upsert: update existing or create new
    // Use $set and strict: false to preserve all stroke fields (rotation, etc.)
    await SketchHistory.findOneAndUpdate(
      { room: room._id, version: roomState.version },
      { 
        $set: {
          strokes: roomState.strokes,
          updatedAt: new Date()
        }
      },
      { upsert: true, strict: false }
    );
    
    markRoomClean(roomCode);
    console.log(`[auto-save] Room ${roomCode}: ${roomState.strokes.length} strokes saved`);
    
    // Debug: log first stroke with rotation if exists
    const rotatedStroke = roomState.strokes.find(s => s.rotation);
    if (rotatedStroke) {
      console.log(`[auto-save] Sample rotated stroke:`, { id: rotatedStroke.id, rotation: rotatedStroke.rotation, tool: rotatedStroke.tool });
    }
    
  } catch (error) {
    console.error(`[auto-save] Error saving room ${roomCode}:`, error.message);
  }
}

/**
 * Force save immediately (call on disconnect/cleanup)
 */
async function forceSave(roomCode) {
  clearSaveTimer(roomCode);
  await performAutoSave(roomCode);
}

module.exports = {
  scheduleAutoSave,
  forceSave,
  markRoomDirty,
  AUTO_SAVE_DELAY
};
