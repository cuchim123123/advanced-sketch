/**
 * Application Constants
 * Centralized configuration values
 */

module.exports = {
  // App Info
  APP_NAME: 'CoPad',
  
  // Token Expiry
  TOKEN_EXPIRY: {
    JWT: process.env.JWT_EXPIRES_IN || '7d',
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
    PASSWORD_RESET: Number(process.env.RESET_TTL_MINUTES) || 15,
    OTP: Number(process.env.OTP_TTL_MINUTES) || 15
  },
  
  // Validation
  VALIDATION: {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    PASSWORD_MIN_LENGTH: 6,
    OTP_LENGTH: Number(process.env.OTP_LENGTH) || 6,
    MAX_OTP_ATTEMPTS: 5,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },
  
  // Room Settings
  ROOM: {
    MIN_PARTICIPANTS: 2,
    MAX_PARTICIPANTS: 50,
    DEFAULT_MAX_PARTICIPANTS: 10
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    OTP_COOLDOWN_MS: 60000 // 1 minute
  },
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR: 500
  }
};
