/**
 * Gateway Rate Limiting Configuration
 * Phase 0: Global 200 req/min, Login 10 req/min
 */
const { ERROR_CODES } = require('@eduelderly/shared');
const rateLimit = require('express-rate-limit');

// Global rate limiter: 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.E_RATE_LIMIT,
        message: 'Too many requests, please try again later'
      }
    });
  }
});

// Login rate limiter: 10 requests per minute per IP
const authLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10,
  message: {
    success: false,
    error: {
      code: ERROR_CODES.E_RATE_LIMIT,
      message: 'Too many login attempts, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts including failed
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: ERROR_CODES.E_RATE_LIMIT,
        message: 'Too many login attempts, please try again later'
      }
    });
  }
});

module.exports = { globalLimiter, authLimiter };
