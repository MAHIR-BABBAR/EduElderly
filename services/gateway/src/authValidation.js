/**
 * Gateway Auth Validation Middleware
 * Phase 0: Stub - returns 200 (JWT validation placeholder)
 */

const { AppError, errorCodes } = require('@eduelderly/shared');

const PUBLIC_ROUTES = [
  { method: 'POST', pattern: /^\/api\/v1\/auth\// },       // all auth routes
  { method: 'GET',  pattern: /^\/health$/ },                // gateway health
  { method: 'GET',  pattern: /^\/health\// },               // upstream health
  { method: 'GET',  pattern: /^\/api\/v1\/courses$/ },      // public browse
  { method: 'GET',  pattern: /^\/api\/v1\/courses\/[\w-]+$/ }, // public detail
];

const isPublicRoute = (method, path) => {
  return PUBLIC_ROUTES.some(
    route => route.method === method && route.pattern.test(path)
  );
};

/**
 * Stub auth validation middleware
 * Phase 0: Always returns 200, allowing all requests
 * Phase 1+: Will validate JWT tokens
 */
const authValidation = (req, res, next) => {
  if (isPublicRoute(req.method, req.path)) {
    return next();
  }

  // Phase 0: Stub - no actual validation
  // Always attach a mock user for Phase 0
  req.user = {
    userId: 'phase0-stub-user',
    role: 'student',
    email: 'stub@eduelderly.local',
    iat: Date.now(),
    exp: Date.now() + 86400000 // 24 hours
  };
  
  // Phase 0: Return 200 always
  next();
};

/**
 * Optional auth middleware - attaches user if token present, but doesn't require it
 * Phase 0: Stub - always continues without error
 */
const optionalAuth = (req, res, next) => {
  // Phase 0: Stub - attach mock user if none exists
  if (!req.user) {
    req.user = {
      userId: 'phase0-anonymous',
      role: 'guest',
      email: null
    };
  }
  next();
};

/**
 * Role-based access control middleware factory
 * Phase 0: Stub - returns 200 for all roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Phase 0: Stub - allow all roles
    next();
  };
};

module.exports = {
  authValidation,
  optionalAuth,
  requireRole
};
