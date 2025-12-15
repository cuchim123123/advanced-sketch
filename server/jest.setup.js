/**
 * Jest Setup
 * Initialize MongoDB Memory Server and global test utilities
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.EMAIL_VERIFICATION_EXPIRES_HOURS = '24';
process.env.NODE_ENV = 'test';

// Mock email sending
jest.mock('./src/libs/mailer.lib.js');

let mongoServer;

// Start MongoDB Memory Server before all tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ MongoDB Memory Server connected');
  } catch (error) {
    console.error('❌ MongoDB Memory Server failed to start:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('✅ MongoDB Memory Server stopped');
  } catch (error) {
    console.error('❌ MongoDB cleanup failed:', error);
  }
});

// Clear all collections after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Global test timeout
jest.setTimeout(10000);
