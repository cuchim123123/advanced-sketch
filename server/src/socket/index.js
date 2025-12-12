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
const { processIncomingStroke } = require('../libs/strokeOptimization');

// In-memory store for active room states
const roomStates = new Map();

// Store for guest participants (in-memory)
const guestParticipants = new Map();

module.exports = (io) => {
  // Authentication middleware for sockets - supports both users and guests
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const guestInfo = socket.handshake.auth.guest;
      
      // Guest authentication
      if (guestInfo && guestInfo.isGuest) {
        socket.user = {
          _id: guestInfo.id,
          id: guestInfo.id,
          username: guestInfo.username,
          isGuest: true
        };
        socket.isGuest = true;
        return next();
      }
      
      // Regular user authentication
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      socket.isGuest = false;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userType = socket.isGuest ? 'Guest' : 'User';
    console.log(`${userType} connected: ${socket.user.username} (${socket.id})`);

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

        let participant;
        const participantColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
        
        if (socket.isGuest) {
          // Handle guest participant (in-memory only)
          const guestKey = `${roomCode}:${socket.user.id}`;
          participant = guestParticipants.get(guestKey) || {
            id: socket.user.id,
            username: socket.user.username,
            isGuest: true,
            color: participantColor,
            socketId: socket.id,
            isActive: true
          };
          participant.socketId = socket.id;
          participant.isActive = true;
          guestParticipants.set(guestKey, participant);
        } else {
          // Create or update participant for registered users
          participant = await SessionParticipant.findOneAndUpdate(
            { room: room._id, user: socket.user._id },
            {
              socketId: socket.id,
              isActive: true,
              lastActiveAt: new Date()
            },
            { upsert: true, new: true }
          );
        }

        // Initialize room state if needed
        if (!roomStates.has(roomCode)) {
          const history = await SketchHistory.findOne({ room: room._id })
            .sort({ version: -1 });
          
          roomStates.set(roomCode, {
            strokes: history?.strokes || [],
            version: history?.version || 1
          });
        }

        // Get all active participants (both registered and guests)
        const dbParticipants = await SessionParticipant.find({
          room: room._id,
          isActive: true
        }).populate('user', 'username avatar');

        // Get guest participants for this room
        const roomGuests = [];
        for (const [key, guest] of guestParticipants.entries()) {
          if (key.startsWith(`${roomCode}:`) && guest.isActive) {
            roomGuests.push(guest);
          }
        }

        // Combine participants
        const allParticipants = [
          ...dbParticipants.map(p => ({
            id: p.user._id,
            username: p.user.username,
            avatar: p.user.avatar,
            color: p.color,
            cursor: p.cursor,
            isGuest: false
          })),
          ...roomGuests.map(g => ({
            id: g.id,
            username: g.username,
            color: g.color,
            isGuest: true
          }))
        ];

        // Send current state to joining user
        socket.emit('room:state', {
          strokes: roomStates.get(roomCode).strokes,
          participants: allParticipants
        });

        // Notify others
        socket.to(roomCode).emit('user:joined', {
          id: socket.user._id || socket.user.id,
          username: socket.user.username,
          avatar: socket.user.avatar,
          color: socket.isGuest ? participant.color : participant.color,
          isGuest: socket.isGuest
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

      // Decompress if stroke was optimized
      const decompressedStroke = processIncomingStroke(stroke);

      // Get user ID consistently (works for both regular users and guests)
      const userId = socket.user._id?.toString() || socket.user.id;

      // Add user info to stroke
      const fullStroke = {
        ...decompressedStroke,
        userId: userId,
        timestamp: new Date()
      };

      // Clear redo stack when user draws new stroke
      const roomState2 = roomStates.get(socket.roomCode);
      if (roomState2?.redoStack?.has(userId)) {
        roomState2.redoStack.set(userId, []);
      }

      // Update existing stroke or add new (prevents duplicates)
      const existingIndex = roomState.strokes.findIndex(s => s.id === stroke.id);
      if (existingIndex >= 0) {
        roomState.strokes[existingIndex] = fullStroke;
      } else {
        roomState.strokes.push(fullStroke);
      }

      // Broadcast to others (not back to sender) - send original optimized format
      socket.to(socket.roomCode).emit('draw:stroke', {
        stroke: stroke, // Keep optimized format for network efficiency
        username: socket.user.username,
        isPreview: stroke.isPreview || false
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
     * UPDATE STROKE
     * Update an existing stroke (for moving text/images)
     */
    socket.on('draw:update', async ({ stroke }) => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState) return;

      // Update stroke in state
      const existingIndex = roomState.strokes.findIndex(s => s.id === stroke.id);
      if (existingIndex >= 0) {
        roomState.strokes[existingIndex] = {
          ...roomState.strokes[existingIndex],
          ...stroke,
          timestamp: new Date()
        };
        
        // Broadcast to others
        socket.to(socket.roomCode).emit('draw:update', { stroke });
      }
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
     * No server-side throttle - client already throttles at 60fps
     * Server just relays immediately for lowest latency
     */
    socket.on('cursor:move', ({ x, y }) => {
      if (!socket.roomCode) return;
      
      // Broadcast to others immediately (no throttle - client handles it)
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
     * RESTORE SNAPSHOT
     * Owner can restore to a previous version
     */
    socket.on('room:restore', async ({ version }) => {
      if (!socket.roomCode) return;

      try {
        const room = await Room.findOne({ code: socket.roomCode });
        if (!room) return;

        // Only owner can restore
        if (room.owner.toString() !== socket.user._id.toString()) {
          socket.emit('error', { message: 'Only room owner can restore snapshots' });
          return;
        }

        const history = await SketchHistory.findOne({
          room: room._id,
          version: version
        });

        if (!history) {
          socket.emit('error', { message: 'Snapshot not found' });
          return;
        }

        const roomState = roomStates.get(socket.roomCode);
        if (roomState) {
          roomState.strokes = history.strokes || [];
          
          // Broadcast restored state to all participants
          io.to(socket.roomCode).emit('room:restored', {
            strokes: roomState.strokes,
            version: version
          });
        }
      } catch (error) {
        console.error('Restore error:', error);
        socket.emit('error', { message: 'Failed to restore snapshot' });
      }
    });

    /**
     * UNDO (user's last stroke)
     */
    socket.on('draw:undo', async () => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState) return;

      // Get current user ID (works for both regular users and guests)
      const currentUserId = socket.user._id?.toString() || socket.user.id;

      // Find and remove user's last stroke
      const userStrokes = roomState.strokes.filter(
        s => (s.userId?.toString() || s.userId) === currentUserId
      );

      if (userStrokes.length > 0) {
        const lastStroke = userStrokes[userStrokes.length - 1];
        
        // Move to redo stack before removing
        if (!roomState.redoStack) roomState.redoStack = new Map();
        if (!roomState.redoStack.has(currentUserId)) {
          roomState.redoStack.set(currentUserId, []);
        }
        roomState.redoStack.get(currentUserId).push(lastStroke);
        
        // Remove from strokes
        roomState.strokes = roomState.strokes.filter(s => s.id !== lastStroke.id);

        io.to(socket.roomCode).emit('draw:erase', { strokeId: lastStroke.id });
      }
    });

    /**
     * REDO (restore user's last undone stroke)
     */
    socket.on('draw:redo', async () => {
      if (!socket.roomCode) return;

      const roomState = roomStates.get(socket.roomCode);
      if (!roomState || !roomState.redoStack) return;

      // Get current user ID
      const currentUserId = socket.user._id?.toString() || socket.user.id;

      const userRedoStack = roomState.redoStack.get(currentUserId);
      if (!userRedoStack || userRedoStack.length === 0) return;

      // Pop from redo stack and add back to strokes
      const strokeToRedo = userRedoStack.pop();
      roomState.strokes.push(strokeToRedo);

      // Broadcast the restored stroke to all users in room
      io.to(socket.roomCode).emit('draw:stroke', {
        stroke: strokeToRedo,
        username: socket.user.username
      });
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
      const userType = socket.isGuest ? 'Guest' : 'User';
      console.log(`${userType} disconnected: ${socket.user.username}`);

      if (socket.roomCode) {
        if (socket.isGuest) {
          // Clean up guest participant
          const guestKey = `${socket.roomCode}:${socket.user.id}`;
          const guest = guestParticipants.get(guestKey);
          if (guest) {
            guest.isActive = false;
            guestParticipants.set(guestKey, guest);
          }
        } else {
          // Update participant status for registered users
          await SessionParticipant.findOneAndUpdate(
            { socketId: socket.id },
            { isActive: false }
          );
        }

        // Notify room
        socket.to(socket.roomCode).emit('user:left', {
          id: socket.user._id || socket.user.id,
          username: socket.user.username,
          isGuest: socket.isGuest
        });

        // Check if room is empty, save state
        const room = await Room.findOne({ code: socket.roomCode });
        if (room) {
          const activeDbCount = await SessionParticipant.countDocuments({
            room: room._id,
            isActive: true
          });
          
          // Count active guests
          let activeGuestCount = 0;
          for (const [key, guest] of guestParticipants.entries()) {
            if (key.startsWith(`${socket.roomCode}:`) && guest.isActive) {
              activeGuestCount++;
            }
          }
          
          const totalActive = activeDbCount + activeGuestCount;

          if (totalActive === 0) {
            // Save final state and clean up
            const roomState = roomStates.get(socket.roomCode);

            if (roomState && roomState.strokes.length > 0) {
              await SketchHistory.create({
                room: room._id,
                version: roomState.version + 1,
                strokes: roomState.strokes
              });
            }

            // Clean up guest participants for this room
            for (const [key] of guestParticipants.entries()) {
              if (key.startsWith(`${socket.roomCode}:`)) {
                guestParticipants.delete(key);
              }
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
      }
    });

    /**
     * CHAT MESSAGE
     * Send chat message to room
     */
    socket.on('chat:send', ({ message }) => {
      if (!socket.roomCode || !message?.trim()) return;

      const chatMessage = {
        message: message.trim(),
        user: {
          id: socket.user._id || socket.user.id,
          username: socket.user.username
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast to all users in room (including sender)
      io.to(socket.roomCode).emit('chat:message', chatMessage);
    });
  });
};
