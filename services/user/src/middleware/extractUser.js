const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ROLES } = require('@eduelderly/shared/constants/roles');

const extractUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];

  if (!userId || !role) {
    return next(new AppError('User context missing', 401, ERROR_CODES.E_AUTH_INVALID));
  }

  req.user = { userId, role };
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== ROLES.ADMIN) {
    return next(new AppError('Admin access required', 403, ERROR_CODES.E_FORBIDDEN));
  }
  next();
};

module.exports = { extractUser, requireAdmin };
