const crypto = require('crypto');
const { AppError } = require('../errors/AppError');
const { ERROR_CODES } = require('../errors/errorCodes');
const { getGatewayKey } = require('../utils/assertRequiredEnv');

/**
 * Verifies that a request carries the gateway key (`X-Gateway-Key`).
 *
 * This is deliberately a *different* secret from the one `serviceAuth` checks.
 * The gateway holds only the gateway key, so it can prove "I am the gateway"
 * on user routes but cannot satisfy the internal-service key that guards
 * service-to-service `/internal` routes. Splitting the two means a regression
 * in the gateway's path filtering can no longer expose internal routes.
 */
const gatewayAuth = (req, res, next) => {
  const key = req.headers['x-gateway-key'];
  if (!key) {
    return next(new AppError('Gateway key missing', 401, ERROR_CODES.E_AUTH_TOKEN_INVALID));
  }

  let expected;
  try {
    expected = getGatewayKey();
  } catch {
    expected = null;
  }
  if (!expected || key.length !== expected.length) {
    return next(new AppError('Unauthorized gateway call', 401, ERROR_CODES.E_AUTH_TOKEN_INVALID));
  }

  if (!crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected))) {
    return next(new AppError('Unauthorized gateway call', 401, ERROR_CODES.E_AUTH_TOKEN_INVALID));
  }

  return next();
};

module.exports = { gatewayAuth };
