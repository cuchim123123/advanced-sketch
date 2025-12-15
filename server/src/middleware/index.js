/**
 * Middleware Exports
 */

const { asyncHandler } = require('./asyncHandler');
const errorHandler = require('./errorHandler');
const { protect, optionalAuth, adminOnly } = require('./auth.middleware');
const { authLimiter, strictAuthLimiter } = require('./rateLimiter.middleware');

module.exports = {
  asyncHandler,
  errorHandler,
  protect,
  optionalAuth,
  adminOnly,
  authLimiter,
  strictAuthLimiter
};
