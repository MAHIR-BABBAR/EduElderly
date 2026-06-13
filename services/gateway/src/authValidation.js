const jwt = require('jsonwebtoken');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ROUTES_CONFIG } = require('../routes.config');

const isKnownRoute = (reqPath) =>
  Object.values(ROUTES_CONFIG).some((service) => reqPath.startsWith(service.prefix));

const isPublicRoute = (method, reqPath) => {
  for (const serviceKey in ROUTES_CONFIG) {
    const service = ROUTES_CONFIG[serviceKey];
    if (!reqPath.startsWith(service.prefix)) continue;

    const endpointPath = reqPath.replace(service.prefix, '') || '';

    return service.public.some((rule) => {
      if (rule.method !== method) return false;
      if (rule.match === 'exact') return endpointPath === rule.path;
      if (rule.match === 'prefix') return endpointPath.startsWith(rule.path);
      if (rule.match === 'regex') return rule.pattern.test(endpointPath);
      return false;
    });
  }
  return false;
};

const authValidation = (req, res, next) => {
  if (!isKnownRoute(req.path)) {
    return next(new AppError('Route Not Found', 404, ERROR_CODES.E_NOT_FOUND));
  }
  if (isPublicRoute(req.method, req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401, ERROR_CODES.E_AUTH_INVALID));
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: 'eduelderly',
      audience: 'eduelderly-client',
    });
    return next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
    return next(new AppError(message, 401, ERROR_CODES.E_AUTH_INVALID));
  }
};

module.exports = { authValidation };
