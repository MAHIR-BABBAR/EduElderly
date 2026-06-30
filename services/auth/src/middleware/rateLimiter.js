const { ERROR_CODES } = require('@eduelderly/shared');
const rateLimit = require('express-rate-limit');

const rateLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: ERROR_CODES.E_RATE_LIMIT,
      message,
    },
  });
};

const noopLimiter = (_req, _res, next) => next();

const authSensitiveLimiter =
  process.env.NODE_ENV === 'test'
    ? noopLimiter
    : rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
        max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX_REQUESTS, 10) || 10,
        standardHeaders: true,
        legacyHeaders: false,
        validate: { trustProxy: false },
        handler: rateLimitHandler('Too many attempts, please try again later'),
      });

module.exports = { authSensitiveLimiter };
