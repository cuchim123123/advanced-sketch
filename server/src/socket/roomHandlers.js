/**
 * Room-related socket event handlers
 */
const { Room, SessionParticipant, SketchHistory, User } = require('../models');
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
        console.log(`[room:join] Room ${roomCode} is being initialized, waiting...`);
        await waitForRoomReady(roomCode);
        console.log(`[room:join] Room ${roomCode} ready after wait`);
      } else {
        // Mark as initializing to prevent race conditions
        markRoomInitializing(roomCode);
        
        try {
          const history = await SketchHistory.findOne({ room: room._id })
            .sort({ version: -1 });
          
          console.log(`[room:join] Loading room ${roomCode}, history found:`, history ? `${history.strokes?.length || 0} strokes, version ${history.version}` : 'none');
          
          const initialState = {
            strokes: history?.strokes || [],
            version: history?.version || 0
          };
          setRoomState(roomCode, initialState);
          console.log(`[room:join] Set state for ${roomCode}:`, initialState.strokes.length, 'strokes, version', initialState.version);
        } finally {
          completeRoomInit(roomCode);
        }
      }
    } else {
      const existingState = getRoomState(roomCode);
      console.log(`[room:join] Room ${roomCode} already in memory:`, existingState?.strokes?.length || 0, 'strokes, version', existingState?.version);
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

    // Update room activity
    room.lastActiveAt = new Date();
    await room.save();

  } catch (error) {
    console.error('Room join error:', error);
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
    });

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
    console.error('Restore error:', error);
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

    console.log('Kicking user:', targetUserId, 'socketId:', targetParticipant.socketId);

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
    console.error('Kick error:', error);
    socket.emit('error', { message: 'Failed to kick user' });
  }
}

/**
 * Handle disconnect event
 */
async function handleDisconnect(socket) {
  const userType = socket.isGuest ? 'Guest' : 'User';
  console.log(`${userType} disconnected: ${socket.user.username}`);

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

    // Force save any pending changes
    await forceSave(socket.roomCode);

    // Check if room is empty
    const room = await Room.findOne({ code: socket.roomCode });
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
 * Handle chat:send event
 */
function handleChatSend(socket, io, { message }) {
  if (!socket.roomCode || !message?.trim()) return;

  const chatMessage = {
    message: message.trim(),
    user: {
      id: socket.user._id || socket.user.id,
      username: socket.user.username
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
