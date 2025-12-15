/**
 * Test Express App
 * Separate app instance for testing without starting server
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/rooms', require('./routes/rooms.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Error handler
const { errorHandler } = require('./middleware');
app.use(errorHandler);

module.exports = app;
