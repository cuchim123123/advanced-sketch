/**
 * Test Helpers
 * Reusable utilities for testing
 */

const { User, Room, OTP } = require('../../models');

/**
 * Create a test user
 * Note: Password will be hashed by the model's pre-save hook
 */
async function createTestUser(overrides = {}) {
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123', // Model will hash this automatically
    isEmailVerified: false,
    ...overrides
  });

  return user;
}

/**
 * Create a verified test user
 */
async function createVerifiedUser(overrides = {}) {
  return createTestUser({
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationTokenExpiresAt: null,
    ...overrides
  });
}

/**
 * Create a test room
 */
async function createTestRoom(ownerId, overrides = {}) {
  const room = await Room.create({
    name: 'Test Room',
    code: 'TEST123',
    owner: ownerId,
    isPublic: true,
    maxParticipants: 10,
    ...overrides
  });

  return room;
}

/**
 * Create test OTP
 */
async function createTestOTP(email, overrides = {}) {
  const otp = await OTP.create({
    email,
    code: '123456',
    purpose: 'email_verification',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    attempts: 0,
    ...overrides
  });

  return otp;
}

/**
 * Wait for async operations
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createTestUser,
  createVerifiedUser,
  createTestRoom,
  createTestOTP,
  delay
};
