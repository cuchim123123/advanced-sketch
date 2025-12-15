/**
 * JWT Utilities
 * Token generation and verification
 */

const jwt = require('jsonwebtoken');
const { TOKEN_EXPIRY } = require('../config/constants');

/**
 * Generate JWT token
 * @param {string|ObjectId|Object} payload - User ID string/ObjectId or full payload object
 */
const generateToken = (payload, expiresIn = TOKEN_EXPIRY.JWT) => {
  // Handle string, ObjectId, or object payload
  let tokenPayload;
  
  if (typeof payload === 'string') {
    tokenPayload = { id: payload };
  } else if (payload && typeof payload.toString === 'function' && payload._bsontype === 'ObjectId') {
    // MongoDB ObjectId
    tokenPayload = { id: payload.toString() };
  } else if (typeof payload === 'object' && payload !== null) {
    tokenPayload = payload;
  } else {
    throw new Error('Invalid JWT payload');
  }
  
  return jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Decode token without verification
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};
