/**
 * Drawing-related socket event handlers
 */
const { processIncomingStroke } = require('../libs/strokeOptimization');
const { getRoomState } = require('./roomState');

/**
 * Handle draw:stroke event
 */
function handleDrawStroke(socket, io, { stroke, isPreview }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  // For preview strokes, just relay immediately without storing
  if (isPreview) {
    socket.to(socket.roomCode).emit('draw:stroke', {
      stroke: { ...stroke, userId: socket.user._id?.toString() || socket.user.id },
      username: socket.user.username,
      isPreview: true
    });
    return;
  }

  // Decompress if stroke was optimized
  const decompressedStroke = processIncomingStroke(stroke);

  // Get user ID consistently
  const userId = socket.user._id?.toString() || socket.user.id;

  // Generate server-side sequence number for ordering
  if (!roomState.sequenceCounter) {
    roomState.sequenceCounter = 0;
  }
  const sequenceNumber = ++roomState.sequenceCounter;

  // Add user info and sequence to stroke
  const fullStroke = {
    ...decompressedStroke,
    userId: userId,
    timestamp: new Date(),
    sequence: sequenceNumber
  };

  // Clear redo stack when user draws new stroke
  if (roomState.redoStack?.has(userId)) {
    roomState.redoStack.set(userId, []);
  }

  // Use Map for O(1) lookup
  if (!roomState.strokesMap) {
    roomState.strokesMap = new Map(
      roomState.strokes.map(s => [s.id, s])
    );
  }

  // Update or insert stroke atomically
  const existingStroke = roomState.strokesMap.get(stroke.id);
  if (existingStroke) {
    if (!existingStroke.sequence || sequenceNumber > existingStroke.sequence) {
      roomState.strokesMap.set(stroke.id, fullStroke);
    }
  } else {
    roomState.strokesMap.set(stroke.id, fullStroke);
  }

  // Sync strokes array with Map
  roomState.strokes = Array.from(roomState.strokesMap.values());

  // Broadcast to others
  socket.to(socket.roomCode).emit('draw:stroke', {
    stroke: { ...stroke, sequence: sequenceNumber },
    username: socket.user.username,
    isPreview: false
  });
}

/**
 * Handle draw:complete event
 */
function handleDrawComplete(socket, { strokeId }) {
  socket.to(socket.roomCode).emit('draw:complete', { strokeId });
}

/**
 * Handle draw:erase event
 */
function handleDrawErase(socket, io, { strokeId }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  if (roomState.strokesMap) {
    roomState.strokesMap.delete(strokeId);
    roomState.strokes = Array.from(roomState.strokesMap.values());
  } else {
    roomState.strokes = roomState.strokes.filter(s => s.id !== strokeId);
  }

  io.to(socket.roomCode).emit('draw:erase', { strokeId });
}

/**
 * Handle draw:update event
 */
function handleDrawUpdate(socket, { stroke }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  if (!roomState.sequenceCounter) {
    roomState.sequenceCounter = 0;
  }
  const sequenceNumber = ++roomState.sequenceCounter;

  if (roomState.strokesMap) {
    const existingStroke = roomState.strokesMap.get(stroke.id);
    if (existingStroke) {
      const updatedStroke = {
        ...existingStroke,
        ...stroke,
        timestamp: new Date(),
        sequence: sequenceNumber
      };
      roomState.strokesMap.set(stroke.id, updatedStroke);
      roomState.strokes = Array.from(roomState.strokesMap.values());
      
      socket.to(socket.roomCode).emit('draw:update', { 
        stroke: { ...stroke, sequence: sequenceNumber } 
      });
    }
  } else {
    const existingIndex = roomState.strokes.findIndex(s => s.id === stroke.id);
    if (existingIndex >= 0) {
      roomState.strokes[existingIndex] = {
        ...roomState.strokes[existingIndex],
        ...stroke,
        timestamp: new Date()
      };
      socket.to(socket.roomCode).emit('draw:update', { stroke });
    }
  }
}

/**
 * Handle draw:clear event
 */
function handleDrawClear(socket, io) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  roomState.strokes = [];
  if (roomState.strokesMap) {
    roomState.strokesMap.clear();
  }

  io.to(socket.roomCode).emit('draw:clear');
}

/**
 * Handle draw:undo event
 */
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
    
    roomState.strokes = roomState.strokes.filter(s => s.id !== lastStroke.id);

    io.to(socket.roomCode).emit('draw:erase', { strokeId: lastStroke.id });
  }
}

/**
 * Handle draw:redo event
 */
function handleDrawRedo(socket, io) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState || !roomState.redoStack) return;

  const currentUserId = socket.user._id?.toString() || socket.user.id;

  const userRedoStack = roomState.redoStack.get(currentUserId);
  if (!userRedoStack || userRedoStack.length === 0) return;

  const strokeToRedo = userRedoStack.pop();
  roomState.strokes.push(strokeToRedo);

  io.to(socket.roomCode).emit('draw:stroke', {
    stroke: strokeToRedo,
    username: socket.user.username
  });
}

/**
 * Handle cursor:move event
 */
function handleCursorMove(socket, { x, y, tool }) {
  if (!socket.roomCode) return;
  
  socket.to(socket.roomCode).emit('cursor:move', {
    userId: socket.user._id,
    x,
    y,
    tool
  });
}

module.exports = {
  handleDrawStroke,
  handleDrawComplete,
  handleDrawErase,
  handleDrawUpdate,
  handleDrawClear,
  handleDrawUndo,
  handleDrawRedo,
  handleCursorMove
};
