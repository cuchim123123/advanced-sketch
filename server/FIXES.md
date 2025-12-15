# CoPad Socket Handler Fixes

This file contains ready-to-apply fixes for the issues identified in `IMPLEMENTATION_NOTES.md`.

## Quick Fix Guide

### Priority Order:
1. **Issue #9** - Room Capacity Check (🔴 High)
2. **Issue #2** - Guest Clear Authorization (🟠 Medium)
3. **Issue #3 & #4** - Undo/Redo Map Sync (🟠 Medium)
4. **Issue #7** - Guest Kick Support (🟠 Medium)
5. **Issue #5** - Preview Cache Cleanup (🟠 Medium)
6. Rest are low priority

---

## Fix #9: Room Capacity Check (CRITICAL)

**File:** `src/socket/roomHandlers.js`

Find the `handleRoomJoin` function and add capacity check after finding the room:

```javascript
async function handleRoomJoin(socket, io, { roomCode }) {
  try {
    const room = await Room.findOne({ code: roomCode });
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // ADD THIS: Check if room is active
    if (!room.isActive) {
      socket.emit('error', { message: 'Room is no longer active' });
      return;
    }

    // ADD THIS: Check room capacity BEFORE joining
    const currentDbParticipants = await SessionParticipant.countDocuments({
      room: room._id,
      isActive: true
    });
    const currentGuests = getRoomGuests(roomCode).length;
    const totalParticipants = currentDbParticipants + currentGuests;

    if (totalParticipants >= room.maxParticipants) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // ... existing code continues ...
```

---

## Fix #2: Guest Clear Authorization

**File:** `src/socket/drawingHandlers.js`

Replace the `handleDrawClear` function:

```javascript
/**
 * Handle draw:clear event
 * Per SPEC FR-DRAW-05: Registered users only (not guests)
 */
function handleDrawClear(socket, io) {
  if (!socket.roomCode) return;

  // Authorization check per SPEC FR-DRAW-05
  if (socket.isGuest) {
    socket.emit('error', { message: 'Guests cannot clear the canvas' });
    return;
  }

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  roomState.strokes = [];
  if (roomState.strokesMap) {
    roomState.strokesMap.clear();
  }

  // Schedule auto-save
  scheduleAutoSave(socket.roomCode);

  io.to(socket.roomCode).emit('draw:clear');
}
```

---

## Fix #3 & #4: Undo/Redo strokesMap Sync

**File:** `src/socket/drawingHandlers.js`

### Fix handleDrawUndo:
```javascript
function handleDrawUndo(socket, io) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  const currentUserId = socket.user._id?.toString() || socket.user.id;

  const userStrokes = roomState.strokes.filter(
    s => (s.userId?.toString() || s.userId) === currentUserId
  );

  if (userStrokes.length > 0) {
    const lastStroke = userStrokes[userStrokes.length - 1];
    
    if (!roomState.redoStack) roomState.redoStack = new Map();
    if (!roomState.redoStack.has(currentUserId)) {
      roomState.redoStack.set(currentUserId, []);
    }
    roomState.redoStack.get(currentUserId).push(lastStroke);
    
    // Remove from strokes array
    roomState.strokes = roomState.strokes.filter(s => s.id !== lastStroke.id);
    
    // FIX: Also remove from strokesMap
    if (roomState.strokesMap) {
      roomState.strokesMap.delete(lastStroke.id);
    }

    scheduleAutoSave(socket.roomCode);
    io.to(socket.roomCode).emit('draw:erase', { strokeId: lastStroke.id });
  }
}
```

### Fix handleDrawRedo:
```javascript
function handleDrawRedo(socket, io) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState || !roomState.redoStack) return;

  const currentUserId = socket.user._id?.toString() || socket.user.id;

  const userRedoStack = roomState.redoStack.get(currentUserId);
  if (!userRedoStack || userRedoStack.length === 0) return;

  const strokeToRedo = userRedoStack.pop();
  roomState.strokes.push(strokeToRedo);

  // FIX: Also add to strokesMap
  if (roomState.strokesMap) {
    roomState.strokesMap.set(strokeToRedo.id, strokeToRedo);
  }

  scheduleAutoSave(socket.roomCode);

  io.to(socket.roomCode).emit('draw:stroke', {
    stroke: strokeToRedo,
    username: socket.user.username
  });
}
```

---

## Fix #1: handleDrawErase check existence

**File:** `src/socket/drawingHandlers.js`

```javascript
function handleDrawErase(socket, io, { strokeId }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  // FIX: Check if stroke exists before removing
  const strokeExists = roomState.strokesMap?.has(strokeId) || 
                       roomState.strokes?.some(s => s.id === strokeId);
  
  if (!strokeExists) {
    return; // Don't broadcast if stroke doesn't exist
  }

  // Remove from map
  if (roomState.strokesMap) {
    roomState.strokesMap.delete(strokeId);
  }
  // Remove from array (preserving order)
  roomState.strokes = (roomState.strokes || []).filter(s => s.id !== strokeId);

  scheduleAutoSave(socket.roomCode);
  io.to(socket.roomCode).emit('draw:erase', { strokeId });
}
```

---

## Fix #6: Remove duplicate requires

**File:** `src/socket/drawingHandlers.js`

At the top of the file, change:
```javascript
const { scheduleAutoSave } = require('./autoSave');
```

To:
```javascript
const { scheduleAutoSave, markRoomDirty } = require('./autoSave');
```

Then remove these lines from inside `handleDrawUpdate` (~line 318-321) and `handleDrawReorder` (~line 469-471):
```javascript
const { markRoomDirty, scheduleAutoSave } = require('./autoSave');
```

---

## Fix #8: Consistent userId in cursor move

**File:** `src/socket/drawingHandlers.js`

```javascript
function handleCursorMove(socket, { x, y, tool }) {
  if (!socket.roomCode) return;
  
  socket.to(socket.roomCode).emit('cursor:move', {
    userId: socket.user._id?.toString() || socket.user.id, // FIX: Consistent format
    x,
    y,
    tool
  });
}
```

---

## Testing After Fixes

After applying fixes, run the test suite:

```bash
cd server
npx jest --forceExit
```

Some tests may need updates if behavior changes (e.g., guest clear now returns error).
