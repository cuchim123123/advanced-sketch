# CoPad Implementation Notes & Potential Improvements

**Generated:** December 15, 2025  
**Last Updated:** December 15, 2025  
**Purpose:** Track potential improvements and issues identified during comprehensive code review

---

## Summary

| ID | Severity | Category | Status |
|----|----------|----------|--------|
| 1 | 🟡 Low | Network Efficiency | Open |
| 2 | 🟠 Medium | Security | Open |
| 3 | 🟠 Medium | Data Consistency | Open |
| 4 | 🟡 Low | Error Handling | Open |
| 5 | 🟠 Medium | Memory Leak | Open |
| 6 | 🟡 Low | Code Quality | Open |
| 7 | 🟠 Medium | Authorization | Open |
| 8 | 🟡 Low | Performance | Open |
| 9 | 🔴 High | Security | Open |
| 10 | 🟠 Medium | Data Integrity | Open |

---

## Issue Details

### 1. 🟡 `handleDrawErase` - Broadcasts even when stroke not found

**File:** `src/socket/drawingHandlers.js:249-265`  
**Severity:** Low  
**Category:** Network Efficiency

**Current Behavior:**
```javascript
io.to(socket.roomCode).emit('draw:erase', { strokeId });
```
Always broadcasts `draw:erase` even if `strokeId` doesn't exist in room state.

**Expected Behavior (per SPEC FR-DRAW):**
Should only broadcast if stroke was actually found and removed.

**Impact:** Unnecessary network traffic, potential client-side confusion.

**Suggested Fix:**
```javascript
function handleDrawErase(socket, io, { strokeId }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  // Check if stroke exists before removing
  const strokeExists = roomState.strokesMap?.has(strokeId) || 
                       roomState.strokes?.some(s => s.id === strokeId);
  
  if (!strokeExists) {
    return; // Don't broadcast if stroke doesn't exist
  }

  // Remove from map
  if (roomState.strokesMap) {
    roomState.strokesMap.delete(strokeId);
  }
  // Remove from array
  roomState.strokes = (roomState.strokes || []).filter(s => s.id !== strokeId);

  scheduleAutoSave(socket.roomCode);
  io.to(socket.roomCode).emit('draw:erase', { strokeId });
}
```

---

### 2. 🟠 `handleDrawClear` - No Guest Authorization Check

**File:** `src/socket/drawingHandlers.js:341-356`  
**Severity:** Medium  
**Category:** Security / Authorization

**SPEC Says (FR-DRAW-05):**
> **Authorization:** Registered users only (not guests)

**Current Behavior:**
```javascript
function handleDrawClear(socket, io) {
  if (!socket.roomCode) return;
  // No authorization check!
  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  roomState.strokes = [];
  // ...
}
```

**Impact:** Guests can clear the entire canvas, violating SPEC requirements.

**Suggested Fix:**
```javascript
function handleDrawClear(socket, io) {
  if (!socket.roomCode) return;
  
  // Per SPEC FR-DRAW-05: Registered users only
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

  scheduleAutoSave(socket.roomCode);
  io.to(socket.roomCode).emit('draw:clear');
}
```

---

### 3. 🟠 `handleDrawUndo` - strokesMap not updated

**File:** `src/socket/drawingHandlers.js:361-390`  
**Severity:** Medium  
**Category:** Data Consistency

**Current Behavior:**
```javascript
function handleDrawUndo(socket, io) {
  // ...
  roomState.strokes = roomState.strokes.filter(s => s.id !== lastStroke.id);
  // strokesMap NOT updated!
}
```

**Impact:** `strokesMap` and `strokes` array become out of sync, causing potential lookup failures in subsequent operations.

**Suggested Fix:**
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
    
    // ALSO remove from strokesMap to maintain consistency
    if (roomState.strokesMap) {
      roomState.strokesMap.delete(lastStroke.id);
    }

    scheduleAutoSave(socket.roomCode);
    io.to(socket.roomCode).emit('draw:erase', { strokeId: lastStroke.id });
  }
}
```

---

### 4. 🟡 `handleDrawRedo` - strokesMap not updated

**File:** `src/socket/drawingHandlers.js:395-418`  
**Severity:** Low  
**Category:** Data Consistency

**Current Behavior:**
```javascript
const strokeToRedo = userRedoStack.pop();
roomState.strokes.push(strokeToRedo);
// strokesMap NOT updated!
```

**Impact:** Same as #3 - Map/Array desync.

**Suggested Fix:**
```javascript
const strokeToRedo = userRedoStack.pop();
roomState.strokes.push(strokeToRedo);

// ALSO add to strokesMap
if (roomState.strokesMap) {
  roomState.strokesMap.set(strokeToRedo.id, strokeToRedo);
}
```

---

### 5. 🟠 `previewStrokesCache` - Potential Memory Leak

**File:** `src/socket/drawingHandlers.js:117-147`  
**Severity:** Medium  
**Category:** Memory Management

**Current Behavior:**
Preview strokes are cached but only cleaned up when:
1. `handleDrawComplete` is called
2. Final stroke is received

**Problem:** If a client disconnects mid-drawing, the cache is never cleaned.

**Suggested Fix:**
Add cleanup in `handleDisconnect`:
```javascript
// In roomHandlers.js handleDisconnect
async function handleDisconnect(socket, io) {
  // ... existing code ...
  
  if (socket.roomCode) {
    // Clean up any preview strokes from this user
    const roomState = getRoomState(socket.roomCode);
    if (roomState?.previewStrokesCache) {
      for (const [strokeId, stroke] of roomState.previewStrokesCache.entries()) {
        if ((stroke.userId || stroke.id?.startsWith(socket.user.id)) === socket.user.id) {
          roomState.previewStrokesCache.delete(strokeId);
        }
      }
    }
  }
  // ... rest of existing code ...
}
```

Also add periodic cleanup:
```javascript
// Clean up stale previews older than 30 seconds
setInterval(() => {
  for (const [roomCode, state] of roomStates.entries()) {
    if (state.previewStrokesCache) {
      const now = Date.now();
      for (const [strokeId, stroke] of state.previewStrokesCache.entries()) {
        if (stroke.timestamp && now - stroke.timestamp > 30000) {
          state.previewStrokesCache.delete(strokeId);
        }
      }
    }
  }
}, 60000);
```

---

### 6. 🟡 Dynamic `require()` inside functions

**File:** `src/socket/drawingHandlers.js:318-321, 333-336, 469-471`  
**Severity:** Low  
**Category:** Code Quality / Performance

**Current Behavior:**
```javascript
// Inside handleDrawUpdate and handleDrawReorder
const { markRoomDirty, scheduleAutoSave } = require('./autoSave');
```

**Problem:** Dynamic require inside functions is:
- Less efficient (resolved every call)
- Harder to test/mock
- Inconsistent (already imported at top of file)

**Suggested Fix:**
Move all requires to top of file (they're already there, just remove the redundant ones):
```javascript
// Top of file - already exists:
const { scheduleAutoSave } = require('./autoSave');

// Add markRoomDirty to the existing import:
const { scheduleAutoSave, markRoomDirty } = require('./autoSave');

// Then remove the inline requires from handleDrawUpdate and handleDrawReorder
```

---

### 7. 🟠 `handleUserKick` - Guest Kick Not Handled

**File:** `src/socket/roomHandlers.js:205-259`  
**Severity:** Medium  
**Category:** Feature Gap

**Current Behavior:**
Only searches `SessionParticipant` database for kick target. Guests are stored in-memory only.

**Impact:** Room owner cannot kick guest users.

**Suggested Fix:**
```javascript
async function handleUserKick(socket, io, { targetUserId }) {
  if (!socket.roomCode) return;

  try {
    const room = await Room.findOne({ code: socket.roomCode });
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.owner.toString() !== socket.user._id.toString()) {
      socket.emit('error', { message: 'Only room owner can kick users' });
      return;
    }

    if (targetUserId === socket.user._id.toString()) {
      socket.emit('error', { message: 'Cannot kick yourself' });
      return;
    }

    // Try to find as registered user first
    const participants = await SessionParticipant.find({
      room: room._id,
      isActive: true
    });

    let targetParticipant = participants.find(
      p => p.user.toString() === targetUserId
    );

    let isGuestKick = false;
    let guestInfo = null;

    // If not found in DB, check guests
    if (!targetParticipant) {
      guestInfo = getGuestParticipant(socket.roomCode, targetUserId);
      if (guestInfo && guestInfo.isActive) {
        isGuestKick = true;
        targetParticipant = guestInfo;
      }
    }

    if (!targetParticipant) {
      socket.emit('error', { message: 'User not found in room' });
      return;
    }

    const targetSocketId = targetParticipant.socketId;
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    
    if (targetSocket) {
      targetSocket.emit('user:kicked');
      targetSocket.leave(socket.roomCode);
      targetSocket.roomCode = null;
    } else {
      io.to(targetSocketId).emit('user:kicked');
    }

    if (isGuestKick) {
      // Mark guest as inactive
      guestInfo.isActive = false;
      setGuestParticipant(socket.roomCode, targetUserId, guestInfo);
      
      io.to(socket.roomCode).emit('user:left', {
        id: targetUserId,
        username: guestInfo.username,
        isGuest: true
      });
    } else {
      await SessionParticipant.findByIdAndUpdate(targetParticipant._id, {
        isActive: false
      });

      const targetUser = await User.findById(targetUserId);
      io.to(socket.roomCode).emit('user:left', {
        id: targetUserId,
        username: targetUser?.username || 'User',
        isGuest: false
      });
    }

  } catch (error) {
    logger.error('Kick error:', error);
    socket.emit('error', { message: 'Failed to kick user' });
  }
}
```

---

### 8. 🟡 `handleCursorMove` - Inconsistent userId format

**File:** `src/socket/drawingHandlers.js:423-433`  
**Severity:** Low  
**Category:** Data Consistency

**Current Behavior:**
```javascript
socket.to(socket.roomCode).emit('cursor:move', {
  userId: socket.user._id,  // Could be ObjectId or string
  x,
  y,
  tool
});
```

**Problem:** Guest users have `socket.user.id` (string), registered users have `socket.user._id` (ObjectId). This causes inconsistent userId format.

**Suggested Fix:**
```javascript
socket.to(socket.roomCode).emit('cursor:move', {
  userId: socket.user._id?.toString() || socket.user.id,
  x,
  y,
  tool
});
```

---

### 9. 🔴 `handleRoomJoin` - No Room Capacity Check

**File:** `src/socket/roomHandlers.js:24-153`  
**Severity:** High  
**Category:** Security / Business Logic

**SPEC Says (FR-ROOM-05):**
> **Validations:**
> - Room not full (`currentParticipants < maxParticipants`)

**Current Behavior:**
No check for room capacity before allowing user to join.

**Impact:** Rooms can exceed their `maxParticipants` limit, violating SPEC.

**Suggested Fix:**
```javascript
async function handleRoomJoin(socket, io, { roomCode }) {
  try {
    const room = await Room.findOne({ code: roomCode });
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Check if room is active
    if (!room.isActive) {
      socket.emit('error', { message: 'Room is no longer active' });
      return;
    }

    // Check room capacity BEFORE joining
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

    // ... rest of existing join logic ...
  } catch (error) {
    // ...
  }
}
```

---

### 10. 🟠 `handleDisconnect` - Race condition with getRoomGuests

**File:** `src/socket/roomHandlers.js:295-350`  
**Severity:** Medium  
**Category:** Data Integrity

**Current Behavior:**
```javascript
const roomGuests = getRoomGuests(socket.roomCode);
const totalActive = activeDbCount + roomGuests.length;
```

`getRoomGuests` only counts guests with `isActive: true`, but the current guest's `isActive` was already set to `false` above:
```javascript
if (guest) {
  guest.isActive = false;
  setGuestParticipant(socket.roomCode, socket.user.id, guest);
}
```

**Impact:** If the disconnecting user is a guest, they're not counted correctly, potentially causing premature room cleanup.

**Suggested Fix:**
This is actually correct behavior (the disconnecting user shouldn't be counted). However, the logic could be clearer:

```javascript
// Calculate remaining active participants (excluding the disconnecting user)
const activeDbCount = await SessionParticipant.countDocuments({
  room: room._id,
  isActive: true
});

// getRoomGuests already excludes inactive guests, so this is correct
const remainingGuests = getRoomGuests(socket.roomCode);
const totalActive = activeDbCount + remainingGuests.length;

logger.socket(`Room ${socket.roomCode} has ${totalActive} remaining participants`);

if (totalActive === 0) {
  // Room is now empty...
}
```

---

## Best Practices Recommendations

### 1. Input Validation
Consider extracting validation to a separate module for reusability:
```javascript
// src/validators/stroke.validator.js
module.exports = { validateStroke, VALID_TOOLS, MAX_POINTS, ... };
```

### 2. Error Handling
Create consistent error response format:
```javascript
function emitError(socket, code, message) {
  socket.emit('error', { code, message, timestamp: new Date().toISOString() });
}
```

### 3. Logging
Add more structured logging for debugging:
```javascript
logger.socket({
  event: 'draw:stroke',
  roomCode: socket.roomCode,
  userId: socket.user.id,
  strokeId: stroke.id,
  tool: stroke.tool
});
```

---

## Notes

- Items marked 🔴 **High** should be fixed before production
- Items marked 🟠 **Medium** should be fixed soon
- Items marked 🟡 **Low** are nice-to-have improvements
- All tests have been adjusted to match current behavior where appropriate
- This document should be updated as issues are resolved
