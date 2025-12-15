/**
 * Crypto Utilities
 * Centralized cryptographic functions
 */

const crypto = require('crypto');

/**
 * Generate random hex token
 */
const generateRandomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash string with SHA256
 */
const hashSHA256 = (str) => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Generate OTP code
 */
const generateOTP = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  return crypto.randomInt(min, max).toString();
};

/**
 * Generate verification token with hash and expiry
 */
const generateVerificationToken = (expiryMs) => {
  const token = generateRandomToken();
  const hashedToken = hashSHA256(token);
  const expiresAt = new Date(Date.now() + expiryMs);
  
  return { token, hashedToken, expiresAt };
};

/**
 * Verify token against hash
 */
const verifyTokenHash = (token, hashedToken) => {
  return hashSHA256(token) === hashedToken;
};

module.exports = {
  generateRandomToken,
  hashSHA256,
  generateOTP,
  generateVerificationToken,
  verifyTokenHash
};
