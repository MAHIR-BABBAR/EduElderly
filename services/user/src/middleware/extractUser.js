const extractUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const role   = req.headers['x-user-role'];
  
  req.user = { userId, role };
  next();
};

module.exports = { extractUser };

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== ROLES.ADMIN) {
    return next(new AppError('Admin access required', 403, ERROR_CODES.E_FORBIDDEN));
  }
  next();
};

module.exports = { extractUser, requireAdmin };