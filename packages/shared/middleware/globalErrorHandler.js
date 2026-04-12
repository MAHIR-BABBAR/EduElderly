const { ERROR_CODES } = require('../errors/ErrorCodes');

const globalErrorHandler = (err, req, res, next) => {
  // 1. Ensure defaults exist (programmer error may not have statusCode)
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // 2. Log appropriately
  if (err.isOperational) {
    // Expected: wrong password, not found, validation fail, etc.
    console.warn({ msg: err.message, code: err.code, path: req.path, statusCode: err.statusCode });
  } else {
    // Unexpected: null reference, DB timeout, library crash
    console.error({ msg: err.message, stack: err.stack, path: req.path });
  }

  // 3. Handle specific Mongoose errors → convert to AppError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(422).json({
      success: false,
      statusCode: 422,
      code: ERROR_CODES.E_VALIDATION,
      message: messages.join(', '),
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      statusCode: 409,
      code: ERROR_CODES.E_EMAIL_TAKEN,
      message: `${field} already exists`,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      code:
        err.name === 'TokenExpiredError'
          ? ERROR_CODES.E_AUTH_TOKEN_EXPIRED
          : ERROR_CODES.E_AUTH_TOKEN_INVALID,
      message: 'Authentication failed',
    });
  }

  // 4. Send response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      code: err.code || null,
      message: err.message,
    });
  }

  // Non-operational: hide internal details in production
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    success: false,
    statusCode: 500,
    code: ERROR_CODES.E_INTERNAL,
    message: 'Something went wrong',
    ...(isDev && { stack: err.stack }),
  });
};

const catchAsync = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { globalErrorHandler, catchAsync };
