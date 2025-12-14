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
 * Track rooms currently being initialized (to prevent race conditions)
 */
const initializingRooms = new Map();

/**
 * Get or initialize room state
 */
function getRoomState(roomCode) {
  return roomStates.get(roomCode);
}

/**
 * Set room state
 */
function setRoomState(roomCode, state) {
  roomStates.set(roomCode, state);
  // Clear initializing flag when state is set
  initializingRooms.delete(roomCode);
}

/**
 * Check if room state exists
 */
function hasRoomState(roomCode) {
  return roomStates.has(roomCode);
}

/**
 * Check if room is currently being initialized
 */
function isRoomInitializing(roomCode) {
  return initializingRooms.has(roomCode);
}

/**
 * Mark room as initializing (returns promise that resolves when ready)
 */
function markRoomInitializing(roomCode) {
  if (!initializingRooms.has(roomCode)) {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    initializingRooms.set(roomCode, { promise, resolve });
  }
  return initializingRooms.get(roomCode);
}

/**
 * Wait for room initialization to complete
 */
async function waitForRoomReady(roomCode) {
  const init = initializingRooms.get(roomCode);
  if (init) {
    await init.promise;
  }
}

/**
 * Complete room initialization
 */
function completeRoomInit(roomCode) {
  const init = initializingRooms.get(roomCode);
  if (init && init.resolve) {
    init.resolve();
  }
  initializingRooms.delete(roomCode);
}

/**
 * Delete room state
 */
function deleteRoomState(roomCode) {
  roomStates.delete(roomCode);
  dirtyRooms.delete(roomCode);
  initializingRooms.delete(roomCode);
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
  // Room initialization lock
  isRoomInitializing,
  markRoomInitializing,
  waitForRoomReady,
  completeRoomInit,
  // Guest helpers
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
