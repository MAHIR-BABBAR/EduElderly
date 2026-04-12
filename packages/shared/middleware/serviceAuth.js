const crypto = require('crypto');
const { AppError } = require('../errors/AppError');
const { ERROR_CODES } = require('../errors/errorCodes');

const serviceAuth = (req, res, next) => {
  const key = req.headers['x-service-key'];

  if (!key) {
    return next(new AppError('Service key missing', 401, ERROR_CODES.E_AUTH_TOKEN_INVALID));
  }

  const expected = process.env.INTERNAL_SERVICE_KEY;
  if (!expected || key.length !== expected.length) {
    return next(new AppError('Unauthorized service call', 401, ERROR_CODES.E_AUTH_TOKEN_INVALID));
  }

  const keyBuf = Buffer.from(key);
  const expBuf = Buffer.from(expected);
  if (!crypto.timingSafeEqual(keyBuf, expBuf)) {
    return next(new AppError('Unauthorized service call', 401, ERROR_CODES.E_AUTH_TOKEN_INVALID));
  }

  next();
};

module.exports = { serviceAuth };