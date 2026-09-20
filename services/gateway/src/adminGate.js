const jwt = require('jsonwebtoken');
const { AppError, ERROR_CODES, ROLES } = require('@eduelderly/shared');

/**
 * Guards operator-facing pages on the gateway (API docs, metrics).
 * Open in development; in production requires an admin JWT unless the named
 * env flag (for example DOCS_PUBLIC or METRICS_PUBLIC) is `true`.
 */
const createAdminGate = (publicFlagEnv) => (req, _res, next) => {
  const isPublic = process.env.NODE_ENV !== 'production' || process.env[publicFlagEnv] === 'true';
  if (isPublic) return next();

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new AppError('Admin token required', 401, ERROR_CODES.E_AUTH_INVALID));
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_ACCESS_SECRET, { algorithms: ['HS256'],
      issuer: 'eduelderly',
      audience: 'eduelderly-client',
    });
    if (payload.role !== ROLES.ADMIN) {
      return next(new AppError('Admin access required', 403, ERROR_CODES.E_FORBIDDEN));
    }
    return next();
  } catch {
    return next(new AppError('Invalid token', 401, ERROR_CODES.E_AUTH_INVALID));
  }
};

module.exports = { createAdminGate };
