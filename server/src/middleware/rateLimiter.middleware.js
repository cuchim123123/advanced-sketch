/**
 * Simple in-memory rate limiter middleware
 * For production, consider using Redis-based rate limiting
 */

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create rate limiter middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 min)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.'
  } = options;

  return (req, res, next) => {
    // Skip rate limiting in test mode or with test header
    if (process.env.NODE_ENV === 'test' || req.headers['x-e2e-test'] === 'true') {
      return next();
    }
    
    // Use IP + route as key
    const key = `${req.ip}:${req.originalUrl}`;
    const now = Date.now();

    let data = rateLimitStore.get(key);

    if (!data || now > data.resetTime) {
      // First request or window expired
      data = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, data);
    } else {
      data.count++;
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - data.count),
      'X-RateLimit-Reset': Math.ceil(data.resetTime / 1000)
    });

    if (data.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }

    next();
  };
}

// Pre-configured limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 min for auth
  message: 'Too many authentication attempts, please try again in 15 minutes.'
});

const strictAuthLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour for password reset
  message: 'Too many password reset attempts, please try again in an hour.'
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please slow down.'
});

module.exports = {
  createRateLimiter,
  authLimiter,
  strictAuthLimiter,
  apiLimiter
};
