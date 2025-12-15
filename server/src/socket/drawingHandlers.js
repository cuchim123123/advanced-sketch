/**
 * Drawing-related socket event handlers
 */
const { processIncomingStroke } = require('../libs/stroke-optimization.lib');
const { getRoomState } = require('./roomState');
const { scheduleAutoSave } = require('./autoSave');

// ========== VALIDATION CONSTANTS ==========
const VALID_TOOLS = ['pen', 'eraser', 'line', 'rectangle', 'circle', 'triangle', 'arrow', 'diamond', 'text', 'image'];
const MAX_POINTS = 10000; // Max points per stroke
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB base64 image limit
const MAX_TEXT_LENGTH = 5000;
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 100;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 200;

/**
 * Validate stroke data from client
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateStroke(stroke) {
  if (!stroke) {
    return { valid: false, error: 'Stroke is required' };
  }

  if (!stroke.id || typeof stroke.id !== 'string') {
    return { valid: false, error: 'Invalid stroke ID' };
  }

  if (!stroke.tool || !VALID_TOOLS.includes(stroke.tool)) {
    return { valid: false, error: `Invalid tool: ${stroke.tool}` };
  }

  // Validate startPoint
  if (!stroke.startPoint || typeof stroke.startPoint.x !== 'number' || typeof stroke.startPoint.y !== 'number') {
    return { valid: false, error: 'Invalid startPoint' };
  }

  // Tool-specific validation
  switch (stroke.tool) {
    case 'pen':
    case 'eraser':
      if (stroke.points && stroke.points.length > MAX_POINTS) {
        return { valid: false, error: `Too many points: ${stroke.points.length} > ${MAX_POINTS}` };
      }
      break;

    case 'text':
      if (!stroke.text || typeof stroke.text !== 'string') {
        return { valid: false, error: 'Text content required for text tool' };
      }
      if (stroke.text.length > MAX_TEXT_LENGTH) {
        return { valid: false, error: `Text too long: ${stroke.text.length} > ${MAX_TEXT_LENGTH}` };
      }
      if (stroke.fontSize && (stroke.fontSize < MIN_FONT_SIZE || stroke.fontSize > MAX_FONT_SIZE)) {
        return { valid: false, error: `Invalid font size: ${stroke.fontSize}` };
      }
      break;

    case 'image':
      if (!stroke.imageData || typeof stroke.imageData !== 'string') {
        return { valid: false, error: 'Image data required for image tool' };
      }
      // Check base64 size (rough estimate)
      const imageSizeEstimate = stroke.imageData.length * 0.75;
      if (imageSizeEstimate > MAX_IMAGE_SIZE) {
        return { valid: false, error: `Image too large: ${Math.round(imageSizeEstimate / 1024)}KB > ${MAX_IMAGE_SIZE / 1024}KB` };
      }
      break;

    case 'line':
    case 'rectangle':
    case 'circle':
    case 'triangle':
    case 'arrow':
    case 'diamond':
      if (!stroke.endPoint || typeof stroke.endPoint.x !== 'number' || typeof stroke.endPoint.y !== 'number') {
        return { valid: false, error: 'endPoint required for shape tools' };
      }
      break;
  }

  // Validate strokeWidth if present
  if (stroke.strokeWidth !== undefined) {
    if (stroke.strokeWidth < MIN_STROKE_WIDTH || stroke.strokeWidth > MAX_STROKE_WIDTH) {
      return { valid: false, error: `Invalid stroke width: ${stroke.strokeWidth}` };
    }
  }

  // Validate color format if present (hex color - 3 or 6 digits, or rgba/rgb)
  if (stroke.color) {
    const isValidHex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(stroke.color);
    const isValidRgb = /^rgba?\([\d\s,.]+\)$/.test(stroke.color);
    if (!isValidHex && !isValidRgb) {
      return { valid: false, error: `Invalid color format: ${stroke.color}` };
    }
  }

  return { valid: true };
}

/**
 * Handle draw:stroke event
 */
function handleDrawStroke(socket, io, { stroke, isPreview }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  // For preview strokes, skip full validation (only basic checks) and relay immediately
  if (isPreview) {
    // Basic validation for preview - just check required fields exist
    if (!stroke || !stroke.id || !stroke.tool) {
      return;
    }
    
    // Initialize preview stroke cache if not exists
    if (!roomState.previewStrokesCache) {
      roomState.previewStrokesCache = new Map();
    }
    
    // Handle delta points - accumulate points for this stroke
    if (stroke.pointsOffset !== undefined && stroke.points) {
      const cached = roomState.previewStrokesCache.get(stroke.id);
      if (cached) {
        // Append new points to cached stroke
        cached.points = cached.points || [];
        cached.points.push(...stroke.points);
        // Relay accumulated stroke
        socket.to(socket.roomCode).emit('draw:stroke', {
          stroke: { ...cached, userId: socket.user._id?.toString() || socket.user.id },
          username: socket.user.username,
          isPreview: true
        });
      } else {
        // First chunk - cache and relay
        roomState.previewStrokesCache.set(stroke.id, { ...stroke });
        socket.to(socket.roomCode).emit('draw:stroke', {
          stroke: { ...stroke, userId: socket.user._id?.toString() || socket.user.id },
          username: socket.user.username,
          isPreview: true
        });
      }
    } else {
      // Non-delta preview (shapes) - relay directly
      socket.to(socket.roomCode).emit('draw:stroke', {
        stroke: { ...stroke, userId: socket.user._id?.toString() || socket.user.id },
        username: socket.user.username,
        isPreview: true
      });
    }
    return;
  }

  // Validate stroke data (full validation for final strokes)
  const validation = validateStroke(stroke);
  if (!validation.valid) {
    socket.emit('error', { message: validation.error });
    return;
  }
  
  // Clean up preview cache for this stroke
  if (roomState.previewStrokesCache) {
    roomState.previewStrokesCache.delete(stroke.id);
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

  // Initialize strokes array if not exists
  if (!roomState.strokes) {
    roomState.strokes = [];
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
      // Update in array at same position
      const idx = roomState.strokes.findIndex(s => s.id === stroke.id);
      if (idx >= 0) roomState.strokes[idx] = fullStroke;
    }
  } else {
    roomState.strokesMap.set(stroke.id, fullStroke);
    // Add to end of array
    roomState.strokes.push(fullStroke);
  }

  // Schedule auto-save (debounced)
  scheduleAutoSave(socket.roomCode);

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
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (roomState?.previewStrokesCache) {
    // Clear preview stroke from cache when drawing is complete
    roomState.previewStrokesCache.delete(strokeId);
  }

  socket.to(socket.roomCode).emit('draw:complete', { strokeId });
}

/**
 * Handle draw:erase event
 */
function handleDrawErase(socket, io, { strokeId }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  // Remove from map
  if (roomState.strokesMap) {
    roomState.strokesMap.delete(strokeId);
  }
  // Remove from array (preserving order)
  roomState.strokes = (roomState.strokes || []).filter(s => s.id !== strokeId);

  // Schedule auto-save
  scheduleAutoSave(socket.roomCode);

  io.to(socket.roomCode).emit('draw:erase', { strokeId });
}

/**
 * Handle draw:update event
 */
function handleDrawUpdate(socket, { stroke, isPreview }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  // Validate stroke data
  const validation = validateStroke(stroke);
  if (!validation.valid) {
    socket.emit('error', { message: validation.error });
    return;
  }

  // If this is a preview (during drag/resize), only broadcast without saving to state
  if (isPreview) {
    socket.to(socket.roomCode).emit('draw:update', { stroke, isPreview: true });
    return;
  }

  // Final update - save to state
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
      
      // Update in-place in array to preserve order
      const existingIndex = roomState.strokes.findIndex(s => s.id === stroke.id);
      if (existingIndex >= 0) {
        roomState.strokes[existingIndex] = updatedStroke;
      }
      
      socket.to(socket.roomCode).emit('draw:update', { 
        stroke: { ...stroke, sequence: sequenceNumber } 
      });
      
      // Mark room dirty for auto-save
      const { markRoomDirty, scheduleAutoSave } = require('./autoSave');
      markRoomDirty(socket.roomCode);
      scheduleAutoSave(socket.roomCode);
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
      
      // Mark room dirty for auto-save
      const { markRoomDirty, scheduleAutoSave } = require('./autoSave');
      markRoomDirty(socket.roomCode);
      scheduleAutoSave(socket.roomCode);
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

  // Schedule auto-save
  scheduleAutoSave(socket.roomCode);

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

    // Schedule auto-save
    scheduleAutoSave(socket.roomCode);

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

  // Schedule auto-save
  scheduleAutoSave(socket.roomCode);

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

/**
 * Handle draw:reorder event
 */
function handleDrawReorder(socket, io, { strokeIds }) {
  if (!socket.roomCode) return;

  const roomState = getRoomState(socket.roomCode);
  if (!roomState) return;

  if (!strokeIds || !Array.isArray(strokeIds)) {
    return;
  }

  // Reorder strokes based on strokeIds array
  if (roomState.strokesMap) {
    const reorderedStrokes = strokeIds
      .map(id => roomState.strokesMap.get(id))
      .filter(Boolean);
    
    roomState.strokes = reorderedStrokes;
    
    // Also rebuild strokesMap to maintain order
    roomState.strokesMap = new Map(reorderedStrokes.map(s => [s.id, s]));
  } else if (roomState.strokes) {
    const strokeMap = new Map(roomState.strokes.map(s => [s.id, s]));
    roomState.strokes = strokeIds
      .map(id => strokeMap.get(id))
      .filter(Boolean);
  }

  // Broadcast reorder to all clients in room (including sender for confirmation)
  io.to(socket.roomCode).emit('draw:reorder', { strokeIds });

  // Mark room dirty for auto-save
  const { markRoomDirty, scheduleAutoSave } = require('./autoSave');
  markRoomDirty(socket.roomCode);
  scheduleAutoSave(socket.roomCode);
}

module.exports = {
  handleDrawStroke,
  handleDrawComplete,
  handleDrawErase,
  handleDrawUpdate,
  handleDrawClear,
  handleDrawUndo,
  handleDrawRedo,
  handleDrawReorder,
  handleCursorMove
};
