const jwt = require('jsonwebtoken');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ROUTES_CONFIG } = require('../routes.config');

const isKnownRoute = (reqPath) =>
  Object.values(ROUTES_CONFIG).some((service) => matchesPrefix(reqPath, service.prefix));

/**
 * A request belongs to a service when it is the prefix exactly or continues
 * with a `/`. Plain `startsWith` would let `/api/v1/coursesXYZ` match the
 * course service.
 */
function matchesPrefix(reqPath, prefix) {
  return reqPath === prefix || reqPath.startsWith(`${prefix}/`);
}

/**
 * The path relative to the service, always starting with `/`.
 * `/api/v1/categories` → `/`, `/api/v1/categories/abc` → `/abc`.
 */
const endpointPathFor = (reqPath, prefix) => reqPath.slice(prefix.length) || '/';

const isPublicRoute = (method, reqPath) => {
  for (const serviceKey in ROUTES_CONFIG) {
    const service = ROUTES_CONFIG[serviceKey];
    if (!matchesPrefix(reqPath, service.prefix)) continue;

    const endpointPath = endpointPathFor(reqPath, service.prefix);

    return service.public.some((rule) => {
      if (rule.method !== method) return false;
      if (rule.match === 'exact') {
        // Rules are written without the leading slash for the service root
        // (path: '') as well as with it, so accept both spellings.
        const target = rule.path === '' ? '/' : rule.path;
        return endpointPath === target;
      }
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

module.exports = { authValidation, isPublicRoute, matchesPrefix, endpointPathFor };
