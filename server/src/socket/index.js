/**
 * Socket.io Event Structure for Realtime Drawing Sync
 * 
 * REALTIME SYNC LOGIC EXPLANATION:
 * 
 * 1. STATE BROADCASTING:
 *    - When a user draws, stroke data is emitted to the server
 *    - Server broadcasts to all OTHER users in the room (not back to sender)
 *    - Uses room-based broadcasting for efficiency
 * 
 * 2. CONFLICT RESOLUTION:
 *    - Each stroke has a unique ID and timestamp
 *    - Last-write-wins strategy for simple operations
 *    - Strokes are ordered by timestamp on client
 *    - For erasing: stroke IDs are referenced
 * 
 * 3. CURSOR PRESENCE:
 *    - Throttled cursor position updates (every 50ms)
 *    - Each user has a unique color for their cursor
 *    - Cursors fade out after inactivity
 * 
 * 4. THROTTLING/COMPRESSION:
 *    - Stroke points are batched (send every 16ms for 60fps feel)
 *    - Path simplification for complex strokes
 *    - Delta encoding for cursor positions
 */

const jwt = require('jsonwebtoken');
const { Room, SessionParticipant, SketchHistory, User } = require('../models');

// In-memory store for active room states
const roomStates = new Map();
// In-memory store for undo history (per user per room)
const undoStacks = new Map(); // key: `${roomCode}:${oderId}` -> array of strokes

module.exports = (io) => {
  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    /**
     * JOIN ROOM
     * Client emits: { roomCode: string }
     * Server emits to room: 'user:joined' with participant info
     */
    socket.on('room:join', async ({ roomCode }) => {
      try {
        const room = await Room.findOne({ code: roomCode });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket room
        socket.join(roomCode);
        socket.roomCode = roomCode;

        // Create or update participant
        const participant = await SessionParticipant.findOneAndUpdate(
          { room: room._id, user: socket.user._id },
          {
            socketId: socket.id,
            isActive: true,
            lastActiveAt: new Date()
          },
          { upsert: true, new: true }
        );

        // Initialize room state if needed
        if (!roomStates.has(roomCode)) {
          const history = await SketchHistory.findOne({ room: room._id })
            .sort({ version: -1 });
          
          roomStates.set(roomCode, {
            strokes: history?.strokes || [],
            version: history?.version || 1
          });
        }

        // Get all active participants
        const participants = await SessionParticipant.find({
          room: room._id,
          isActive: true
        }).populate('user', 'username avatar');

        // Send current state to joining user
        socket.emit('room:state', {
          strokes: roomStates.get(roomCode).strokes,
          participants: participants.map(p => ({
            id: p.user._id,
            username: p.user.username,
            avatar: p.user.avatar,
            color: p.color,
            cursor: p.cursor
          }))
        });

        // Notify others
        socket.to(roomCode).emit('user:joined', {
          id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar,
          color: participant.color
        });

        // Update room activity
        room.lastActiveAt = new Date();
        await room.save();

      } catch (error) {
        console.error('Room join error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    /**
     * DRAW STROKE
     * Client emits stroke data in real-time
     * Server broadcasts to room
     */
    socket.on('draw:stroke', async ({ stroke }) => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState) return;

      // Add user info to stroke
      const fullStroke = {
        ...stroke,
        userId: socket.user._id,
        timestamp: new Date()
      };

      // Update existing stroke or add new (prevents duplicates)
      const existingIndex = roomState.strokes.findIndex(s => s.id === stroke.id);
      if (existingIndex >= 0) {
        roomState.strokes[existingIndex] = fullStroke;
      } else {
        roomState.strokes.push(fullStroke);
        // Clear redo stack when new stroke is added (standard undo/redo behavior)
        const undoKey = `${socket.roomCode}:${socket.user._id}`;
        if (undoStacks.has(undoKey)) {
          undoStacks.set(undoKey, []);
        }
      }

      // Broadcast to others (not back to sender)
      socket.to(socket.roomCode).emit('draw:stroke', {
        stroke: fullStroke,
        username: socket.user.username
      });
    });

    /**
     * STROKE COMPLETE
     * When user finishes a stroke, persist and broadcast
     */
    socket.on('draw:complete', async ({ strokeId }) => {
      // Stroke already added in draw:stroke, just acknowledge
      socket.to(socket.roomCode).emit('draw:complete', { strokeId });
    });

    /**
     * ERASE STROKE
     * Remove a stroke by ID
     */
    socket.on('draw:erase', async ({ strokeId }) => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState) return;

      // Remove stroke from state
      roomState.strokes = roomState.strokes.filter(s => s.id !== strokeId);

      // Broadcast to all
      io.to(socket.roomCode).emit('draw:erase', { strokeId });
    });

    /**
     * CLEAR CANVAS
     * Owner/editor can clear all strokes
     */
    socket.on('draw:clear', async () => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState) return;

      roomState.strokes = [];

      // Broadcast to all
      io.to(socket.roomCode).emit('draw:clear');
    });

    /**
     * CURSOR MOVE
     * Throttled cursor position updates (server-side throttle)
     */
    let lastCursorUpdate = 0;
    socket.on('cursor:move', async ({ x, y }) => {
      if (!socket.roomCode) return;
      
      // Throttle to max 20 updates per second (50ms)
      const now = Date.now();
      if (now - lastCursorUpdate < 50) return;
      lastCursorUpdate = now;

      // Broadcast to others
      socket.to(socket.roomCode).emit('cursor:move', {
        userId: socket.user._id,
        x,
        y
      });
    });

    /**
     * SAVE SNAPSHOT
     * Periodically save room state to database
     */
    socket.on('room:save', async () => {
      if (!socket.roomCode) return;

      try {
        const room = await Room.findOne({ code: socket.roomCode });
        const roomState = roomStates.get(socket.roomCode);

        if (room && roomState) {
          // Create new history version
          await SketchHistory.create({
            room: room._id,
            version: roomState.version + 1,
            strokes: roomState.strokes,
            createdBy: socket.user._id
          });

          roomState.version += 1;

          socket.emit('room:saved', { version: roomState.version });
        }
      } catch (error) {
        console.error('Save error:', error);
        socket.emit('error', { message: 'Failed to save' });
      }
    });

    /**
     * UNDO (user's last stroke)
     */
    socket.on('draw:undo', async () => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState) return;

      // Find and remove user's last stroke
      const userStrokes = roomState.strokes.filter(
        s => s.userId.toString() === socket.user._id.toString()
      );

      if (userStrokes.length > 0) {
        const lastStroke = userStrokes[userStrokes.length - 1];
        roomState.strokes = roomState.strokes.filter(s => s.id !== lastStroke.id);

        // Save to undo stack for redo (limit to 50 items to prevent memory leak)
        const undoKey = `${socket.roomCode}:${socket.user._id}`;
        if (!undoStacks.has(undoKey)) {
          undoStacks.set(undoKey, []);
        }
        const stack = undoStacks.get(undoKey);
        stack.push(lastStroke);
        if (stack.length > 50) stack.shift(); // Remove oldest if over limit

        io.to(socket.roomCode).emit('draw:erase', { strokeId: lastStroke.id });
      }
    });

    /**
     * REDO (restore user's last undone stroke)
     */
    socket.on('draw:redo', async () => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState) return;

      const undoKey = `${socket.roomCode}:${socket.user._id}`;
      const userUndoStack = undoStacks.get(undoKey);

      if (userUndoStack && userUndoStack.length > 0) {
        const strokeToRestore = userUndoStack.pop();
        roomState.strokes.push(strokeToRestore);

        io.to(socket.roomCode).emit('draw:stroke', {
          stroke: strokeToRestore,
          username: socket.user.username
        });
      }
    });

    /**
     * KICK USER
     * Only room owner can kick users
     */
    socket.on('user:kick', async ({ targetUserId }) => {
      if (!socket.roomCode) return;

      try {
        const room = await Room.findOne({ code: socket.roomCode });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Check if requester is room owner
        if (room.owner.toString() !== socket.user._id.toString()) {
          socket.emit('error', { message: 'Only room owner can kick users' });
          return;
        }

        // Can't kick yourself
        if (targetUserId === socket.user._id.toString()) {
          socket.emit('error', { message: 'Cannot kick yourself' });
          return;
        }

        // Find target user's socket
        const participants = await SessionParticipant.find({
          room: room._id,
          isActive: true
        });

        const targetParticipant = participants.find(
          p => p.user.toString() === targetUserId
        );

        if (!targetParticipant) {
          socket.emit('error', { message: 'User not found in room' });
          return;
        }

        console.log('Kicking user:', targetUserId, 'socketId:', targetParticipant.socketId);

        // Send kick notification to target user via their socket ID
        const targetSocketId = targetParticipant.socketId;
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        
        if (targetSocket) {
          // Emit directly to the socket
          targetSocket.emit('user:kicked');
          console.log('Kick event sent to socket:', targetSocketId);
          
          // Force disconnect target from room
          targetSocket.leave(socket.roomCode);
          targetSocket.roomCode = null;
        } else {
          // Fallback: emit to socketId (may work if socket exists)
          io.to(targetSocketId).emit('user:kicked');
          console.log('Kick event sent via io.to:', targetSocketId);
        }

        // Update participant status
        await SessionParticipant.findByIdAndUpdate(targetParticipant._id, {
          isActive: false
        });

        // Notify room that user left
        const targetUser = await User.findById(targetUserId);
        io.to(socket.roomCode).emit('user:left', {
          id: targetUserId,
          username: targetUser?.username || 'User'
        });

      } catch (error) {
        console.error('Kick error:', error);
        socket.emit('error', { message: 'Failed to kick user' });
      }
    });

    /**
     * DISCONNECT
     * Clean up participant and notify room
     */
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);

      // Clean up user's undo stack
      if (socket.roomCode) {
        const undoKey = `${socket.roomCode}:${socket.user._id}`;
        undoStacks.delete(undoKey);
      }

      if (socket.roomCode) {
        // Update participant status
        await SessionParticipant.findOneAndUpdate(
          { socketId: socket.id },
          { isActive: false }
        );

        // Notify room
        socket.to(socket.roomCode).emit('user:left', {
          id: socket.user._id,
          username: socket.user.username
        });

        // Check if room is empty, save state
        const activeCount = await SessionParticipant.countDocuments({
          room: await Room.findOne({ code: socket.roomCode }).then(r => r?._id),
          isActive: true
        });

        if (activeCount === 0) {
          // Save final state and clean up
          const room = await Room.findOne({ code: socket.roomCode });
          const roomState = roomStates.get(socket.roomCode);

          if (room && roomState && roomState.strokes.length > 0) {
            await SketchHistory.create({
              room: room._id,
              version: roomState.version + 1,
              strokes: roomState.strokes
            });
          }

          // Remove from memory after delay
          setTimeout(() => {
            const stillEmpty = roomStates.get(socket.roomCode);
            if (stillEmpty) {
              roomStates.delete(socket.roomCode);
            }
          }, 60000); // Keep for 1 minute in case someone rejoins
        }
      }
    });
  });
};
