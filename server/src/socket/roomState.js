/**
 * In-memory store for active room states
 * Shared across all socket handlers
 */
const roomStates = new Map();

/**
 * Store for guest participants (in-memory)
 */
const guestParticipants = new Map();

/**
 * Debounce timers for auto-save
 */
const saveTimers = new Map();

/**
 * Track dirty rooms (have unsaved changes)
 */
const dirtyRooms = new Set();

/**
 * Get or initialize room state
 */
async function getRoomState(roomCode) {
  return roomStates.get(roomCode);
}

/**
 * Set room state
 */
function setRoomState(roomCode, state) {
  roomStates.set(roomCode, state);
}

/**
 * Check if room state exists
 */
function hasRoomState(roomCode) {
  return roomStates.has(roomCode);
}

/**
 * Delete room state
 */
function deleteRoomState(roomCode) {
  roomStates.delete(roomCode);
  dirtyRooms.delete(roomCode);
  if (saveTimers.has(roomCode)) {
    clearTimeout(saveTimers.get(roomCode));
    saveTimers.delete(roomCode);
  }
}

/**
 * Mark room as dirty (has unsaved changes)
 */
function markRoomDirty(roomCode) {
  dirtyRooms.add(roomCode);
}

/**
 * Check if room is dirty
 */
function isRoomDirty(roomCode) {
  return dirtyRooms.has(roomCode);
}

/**
 * Mark room as clean (saved)
 */
function markRoomClean(roomCode) {
  dirtyRooms.delete(roomCode);
}

/**
 * Get/set save timer for debouncing
 */
function getSaveTimer(roomCode) {
  return saveTimers.get(roomCode);
}

function setSaveTimer(roomCode, timer) {
  saveTimers.set(roomCode, timer);
}

function clearSaveTimer(roomCode) {
  if (saveTimers.has(roomCode)) {
    clearTimeout(saveTimers.get(roomCode));
    saveTimers.delete(roomCode);
  }
}

/**
 * Get guest participant
 */
function getGuestParticipant(roomCode, guestId) {
  return guestParticipants.get(`${roomCode}:${guestId}`);
}

/**
 * Set guest participant
 */
function setGuestParticipant(roomCode, guestId, participant) {
  guestParticipants.set(`${roomCode}:${guestId}`, participant);
}

/**
 * Get all active guests in a room
 */
function getRoomGuests(roomCode) {
  const guests = [];
  for (const [key, guest] of guestParticipants.entries()) {
    if (key.startsWith(`${roomCode}:`) && guest.isActive) {
      guests.push(guest);
    }
  }
  return guests;
}

/**
 * Clean up guests for a room
 */
function cleanupRoomGuests(roomCode) {
  for (const [key] of guestParticipants.entries()) {
    if (key.startsWith(`${roomCode}:`)) {
      guestParticipants.delete(key);
    }
  }
}

module.exports = {
  roomStates,
  guestParticipants,
  getRoomState,
  setRoomState,
  hasRoomState,
  deleteRoomState,
  getGuestParticipant,
  setGuestParticipant,
  getRoomGuests,
  cleanupRoomGuests,
  // Auto-save helpers
  markRoomDirty,
  markRoomClean,
  isRoomDirty,
  getSaveTimer,
  setSaveTimer,
  clearSaveTimer
};
