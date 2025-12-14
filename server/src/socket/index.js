/**
 * Socket.io Event Structure for Realtime Drawing Sync
 * 
 * REALTIME SYNC LOGIC:
 * - State broadcasting: Stroke data emitted to server, broadcast to all OTHER users
 * - Conflict resolution: Last-write-wins with sequence numbers
 * - Cursor presence: Throttled updates (50ms), unique colors
 * - Compression: Stroke batching, path simplification
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Import handlers
const {
  handleDrawStroke,
  handleDrawComplete,
  handleDrawErase,
  handleDrawUpdate,
  handleDrawClear,
  handleDrawUndo,
  handleDrawRedo,
  handleCursorMove
} = require('./drawingHandlers');

const {
  handleRoomJoin,
  handleRoomSave,
  handleRoomRestore,
  handleUserKick,
  handleDisconnect,
  handleChatSend
} = require('./roomHandlers');

module.exports = (io) => {
  // Authentication middleware
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

    // Room events
    socket.on('room:join', (data) => handleRoomJoin(socket, io, data));
    socket.on('room:save', () => handleRoomSave(socket));
    socket.on('room:restore', (data) => handleRoomRestore(socket, io, data));
    
    // Drawing events
    socket.on('draw:stroke', (data) => handleDrawStroke(socket, io, data));
    socket.on('draw:complete', (data) => handleDrawComplete(socket, data));
    socket.on('draw:erase', (data) => handleDrawErase(socket, io, data));
    socket.on('draw:update', (data) => handleDrawUpdate(socket, data));
    socket.on('draw:clear', () => handleDrawClear(socket, io));
    socket.on('draw:undo', () => handleDrawUndo(socket, io));
    socket.on('draw:redo', () => handleDrawRedo(socket, io));
    
    // Cursor events
    socket.on('cursor:move', (data) => handleCursorMove(socket, data));
    
    // User events
    socket.on('user:kick', (data) => handleUserKick(socket, io, data));
    
    // Chat events
    socket.on('chat:send', (data) => handleChatSend(socket, io, data));
    
    // Disconnect
    socket.on('disconnect', () => handleDisconnect(socket));
  });
};
