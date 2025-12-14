/**
 * Room-related socket event handlers
 */
const { Room, SessionParticipant, SketchHistory, User } = require('../models');
const logger = require('../libs/logger.lib');
const { 
  getRoomState, 
  setRoomState, 
  hasRoomState,
  deleteRoomState,
  isRoomInitializing,
  markRoomInitializing,
  waitForRoomReady,
  completeRoomInit,
  getGuestParticipant,
  setGuestParticipant,
  getRoomGuests,
  cleanupRoomGuests
} = require('./roomState');
const { forceSave } = require('./autoSave');

/**
 * Handle room:join event
 */
async function handleRoomJoin(socket, io, { roomCode }) {
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
      participant = getGuestParticipant(roomCode, socket.user.id) || {
        id: socket.user.id,
        username: socket.user.username,
        isGuest: true,
        color: participantColor,
        socketId: socket.id,
        isActive: true
      };
      participant.socketId = socket.id;
      participant.isActive = true;
      setGuestParticipant(roomCode, socket.user.id, participant);
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

    // Initialize room state if needed (with lock to prevent race conditions)
    if (!hasRoomState(roomCode)) {
      // Check if another user is already initializing this room
      if (isRoomInitializing(roomCode)) {
        logger.socket(`Room ${roomCode} is being initialized, waiting...`);
        await waitForRoomReady(roomCode);
        logger.socket(`Room ${roomCode} ready after wait`);
      } else {
        // Mark as initializing to prevent race conditions
        markRoomInitializing(roomCode);
        
        try {
          const history = await SketchHistory.findOne({ room: room._id })
            .sort({ version: -1 })
            .lean(); // Use lean() to get plain objects with all fields
          
          logger.socket(`Loading room ${roomCode}, history found:`, history ? `${history.strokes?.length || 0} strokes, version ${history.version}` : 'none');
          
          // Debug: log rotated strokes
          if (history?.strokes) {
            const rotatedStrokes = history.strokes.filter(s => s.rotation);
            logger.debug(`Rotated strokes in DB:`, rotatedStrokes.length, rotatedStrokes.map(s => ({ id: s.id, rotation: s.rotation })));
          }
          
          const initialState = {
            strokes: history?.strokes || [],
            version: history?.version || 0
          };
          setRoomState(roomCode, initialState);
          logger.socket(`Set state for ${roomCode}:`, initialState.strokes.length, 'strokes, version', initialState.version);
        } finally {
          completeRoomInit(roomCode);
        }
      }
    } else {
      const existingState = getRoomState(roomCode);
      logger.socket(`Room ${roomCode} already in memory:`, existingState?.strokes?.length || 0, 'strokes, version', existingState?.version);
    }

    // Get all active participants
    const dbParticipants = await SessionParticipant.find({
      room: room._id,
      isActive: true
    }).populate('user', 'username avatar');

    // Get guest participants for this room
    const roomGuests = getRoomGuests(roomCode);

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
      strokes: getRoomState(roomCode).strokes,
      participants: allParticipants
    });

    // Notify others
    socket.to(roomCode).emit('user:joined', {
      id: socket.user._id || socket.user.id,
      username: socket.user.username,
      avatar: socket.user.avatar,
      color: participant.color,
      isGuest: socket.isGuest
    });

    // Broadcast to dashboard listeners about participant count change
    io.emit('dashboard:roomUpdate', {
      roomCode,
      participantCount: allParticipants.length
    });

    // Update room activity
    room.lastActiveAt = new Date();
    await room.save();

  } catch (error) {
    logger.error('Room join error:', error);
    socket.emit('error', { message: 'Failed to join room' });
  }
}

/**
 * Handle room:restore event
 */
async function handleRoomRestore(socket, io, { version }) {
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
    }).lean();

    if (!history) {
      socket.emit('error', { message: 'Snapshot not found' });
      return;
    }

    const roomState = getRoomState(socket.roomCode);
    if (roomState) {
      roomState.strokes = history.strokes || [];
      
      io.to(socket.roomCode).emit('room:restored', {
        strokes: roomState.strokes,
        version: version
      });
    }
  } catch (error) {
    logger.error('Restore error:', error);
    socket.emit('error', { message: 'Failed to restore snapshot' });
  }
}

/**
 * Handle user:kick event
 */
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

    logger.socket('Kicking user:', targetUserId, 'socketId:', targetParticipant.socketId);

    const targetSocketId = targetParticipant.socketId;
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    
    if (targetSocket) {
      targetSocket.emit('user:kicked');
      targetSocket.leave(socket.roomCode);
      targetSocket.roomCode = null;
    } else {
      io.to(targetSocketId).emit('user:kicked');
    }

    await SessionParticipant.findByIdAndUpdate(targetParticipant._id, {
      isActive: false
    });

    const targetUser = await User.findById(targetUserId);
    io.to(socket.roomCode).emit('user:left', {
      id: targetUserId,
      username: targetUser?.username || 'User'
    });

  } catch (error) {
    logger.error('Kick error:', error);
    socket.emit('error', { message: 'Failed to kick user' });
  }
}

/**
 * Handle disconnect event
 */
async function handleDisconnect(socket, io) {
  const userType = socket.isGuest ? 'Guest' : 'User';
  logger.socket(`${userType} disconnected: ${socket.user.username}`);

  if (socket.roomCode) {
    if (socket.isGuest) {
      const guest = getGuestParticipant(socket.roomCode, socket.user.id);
      if (guest) {
        guest.isActive = false;
        setGuestParticipant(socket.roomCode, socket.user.id, guest);
      }
    } else {
      await SessionParticipant.findOneAndUpdate(
        { socketId: socket.id },
        { isActive: false }
      );
    }

    socket.to(socket.roomCode).emit('user:left', {
      id: socket.user._id || socket.user.id,
      username: socket.user.username,
      isGuest: socket.isGuest
    });

    // Calculate new participant count and broadcast to dashboard
    const room = await Room.findOne({ code: socket.roomCode });
    if (room) {
      const dbCount = await SessionParticipant.countDocuments({ room: room._id, isActive: true });
      const guestCount = getRoomGuests(socket.roomCode).filter(g => g.isActive).length;
      io.emit('dashboard:roomUpdate', {
        roomCode: socket.roomCode,
        participantCount: dbCount + guestCount
      });
    }

    // Force save any pending changes
    await forceSave(socket.roomCode);

    // Check if room is empty
    if (room) {
      const activeDbCount = await SessionParticipant.countDocuments({
        room: room._id,
        isActive: true
      });
      
      const roomGuests = getRoomGuests(socket.roomCode);
      const totalActive = activeDbCount + roomGuests.length;

      if (totalActive === 0) {
        const roomState = getRoomState(socket.roomCode);

        if (roomState && roomState.strokes?.length > 0) {
          await SketchHistory.create({
            room: room._id,
            version: roomState.version + 1,
            strokes: roomState.strokes
          });
        }

        cleanupRoomGuests(socket.roomCode);

        setTimeout(() => {
          if (getRoomState(socket.roomCode)) {
            deleteRoomState(socket.roomCode);
          }
        }, 60000);
      }
    }
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 * Escapes HTML special characters
 */
function sanitizeInput(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

// Max chat message length
const MAX_CHAT_MESSAGE_LENGTH = 1000;

/**
 * Handle chat:send event
 */
function handleChatSend(socket, io, { message }) {
  if (!socket.roomCode || !message?.trim()) return;

  // Validate message length
  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_CHAT_MESSAGE_LENGTH) {
    socket.emit('error', { message: `Message too long (max ${MAX_CHAT_MESSAGE_LENGTH} characters)` });
    return;
  }

  // Sanitize message to prevent XSS
  const sanitizedMessage = sanitizeInput(trimmedMessage);

  const chatMessage = {
    message: sanitizedMessage,
    user: {
      id: socket.user._id || socket.user.id,
      username: sanitizeInput(socket.user.username) // Also sanitize username
    },
    timestamp: new Date().toISOString()
  };

  io.to(socket.roomCode).emit('chat:message', chatMessage);
}

module.exports = {
  handleRoomJoin,
  handleRoomRestore,
  handleUserKick,
  handleDisconnect,
  handleChatSend
};
