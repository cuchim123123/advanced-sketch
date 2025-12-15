/**
 * Async Handler Wrapper
 * Wraps async functions to automatically catch errors and pass to error handler
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
