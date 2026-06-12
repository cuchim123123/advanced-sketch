require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db.config');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS and compression
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  // Enable per-message compression for reduced bandwidth
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
    zlibDeflateOptions: {
      chunkSize: 16 * 1024 // 16KB chunks
    },
    zlibInflateOptions: {
      chunkSize: 16 * 1024
    }
  },
  // Optimize transport
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  // Connection stability settings
  pingTimeout: 30000, // How long to wait for pong before considering connection dead
  pingInterval: 25000, // How often to send ping packets
  connectTimeout: 20000, // How long to wait for initial connection
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
const path = require('path');
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// API Routes
app.use('/api/auth', require('./modules/auth/auth.module'));
app.use('/api/rooms', require('./routes/rooms.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
require('./socket')(io);

// Serve React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown - save all rooms before exit
const { roomStates } = require('./socket/roomState');
const { forceSave } = require('./socket/autoSave');

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Saving all rooms...`);
  
  const savePromises = [];
  for (const roomCode of roomStates.keys()) {
    savePromises.push(forceSave(roomCode));
  }
  
  try {
    await Promise.all(savePromises);
    console.log(`Saved ${savePromises.length} rooms`);
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
  
  server.close(async () => {
    if (global.__MONGO_MEMORY_SERVER__) {
      try {
        await global.__MONGO_MEMORY_SERVER__.stop();
        console.log('MongoDB Memory Server stopped');
      } catch (err) {
        console.error('Error stopping MongoDB Memory Server:', err);
      }
    }
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10s
  setTimeout(() => {
    console.log('Forcing exit...');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, io };
