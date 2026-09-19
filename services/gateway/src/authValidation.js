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

/**
 * Endpoint paths that a client must never be able to reach through the gateway,
 * whatever token they hold. `/internal/*` is service-to-service only; `/docs`
 * and `/metrics` are operator surfaces. The gateway stamps the real service key
 * onto every proxied request, so without this block any valid JWT would let a
 * learner call, for example, `POST /api/v1/enrollments/internal/enroll`.
 */
const BLOCKED_ENDPOINT = /^\/(internal|docs|metrics)(\/|$)/i;

// Decode a single layer of percent-encoding so `/%69nternal` and `/internal`
// are treated the same; malformed encoding is rejected by the caller.
const decodeOnce = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

/**
 * True when the request targets a proxied service's `/internal`, `/docs` or
 * `/metrics` endpoint (raw or percent-encoded). Only proxied services (those
 * with a `target`) are considered; the gateway's own `/docs` and `/metrics`
 * are guarded separately by the admin gate.
 */
const isBlockedEndpoint = (reqPath) => {
  for (const serviceKey in ROUTES_CONFIG) {
    const service = ROUTES_CONFIG[serviceKey];
    if (!service.target) continue;
    if (!matchesPrefix(reqPath, service.prefix)) continue;

    const endpointPath = endpointPathFor(reqPath, service.prefix);
    if (BLOCKED_ENDPOINT.test(endpointPath)) return true;
    const decoded = decodeOnce(endpointPath);
    return decoded !== null && BLOCKED_ENDPOINT.test(decoded);
  }
  return false;
};

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
  // Internal/operator endpoints are never client-reachable. This runs before
  // the public-route and JWT checks so no token — valid or not — opens them.
  if (isBlockedEndpoint(req.path)) {
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

module.exports = {
  authValidation,
  isPublicRoute,
  matchesPrefix,
  endpointPathFor,
  isBlockedEndpoint,
};
