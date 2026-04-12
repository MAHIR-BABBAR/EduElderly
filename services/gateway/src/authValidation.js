const jwt = require('jsonwebtoken');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ROUTES_CONFIG } = require('../../../routes.config');

const isKnownRoute = (reqPath) => {
  // Convert the config object to an array of services and check their prefixes
  return Object.values(ROUTES_CONFIG).some(service => reqPath.startsWith(service.prefix));
};

const isPublicRoute = (method, reqPath) => {
  // Loop through all services in the config
  for (const serviceKey in ROUTES_CONFIG) {
    const service = ROUTES_CONFIG[serviceKey];

    // Check if the request path belongs to this service's prefix
    if (reqPath.startsWith(service.prefix)) {

      // Strip the prefix to evaluate the endpoint path (e.g. '/api/v1/auth/register' -> '/register')
      const endpointPath = reqPath.replace(service.prefix, '') || '';

      // Check against the service's public rules
      return service.public.some(rule => {
        if (rule.method !== method) return false;

        if (rule.match === 'exact') return endpointPath === rule.path;
        if (rule.match === 'prefix') return endpointPath.startsWith(rule.path);
        if (rule.match === 'regex') return rule.pattern.test(endpointPath);

        return false;
      });
    }
  }
  return false; // If it doesn't match any public rule, it is protected
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
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token';
    return next(new AppError(message, 401, ERROR_CODES.E_AUTH_INVALID));
  }
};

module.exports = { authValidation };