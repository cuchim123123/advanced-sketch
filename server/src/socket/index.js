/**
 * Socket.io Entry Point
 * Wires the Hexagonal Architecture Sockets Modules
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../libs/logger.lib');

const { initializeSketchModule } = require('../modules/sketch/sketch.module');
const { initializeRoomModule } = require('../modules/room/room.module');

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
    logger.socket(`${userType} connected: ${socket.user.username} (${socket.id})`);

    // Bootstrap Sketch and Room modules for this socket
    initializeSketchModule(io, socket);
    initializeRoomModule(io, socket);
  });
};
