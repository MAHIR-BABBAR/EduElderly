/**
 * Aggregated API documentation.
 *
 * Every service publishes its own OpenAPI document at `<service>/docs.json`.
 * The gateway serves one Swagger UI at `/docs` with a service picker, and
 * proxies each document through `/docs/specs/<service>` so the browser never
 * needs network access to the Docker-internal service addresses.
 *
 * Access: open in development. In production the UI and specs require an admin
 * JWT unless DOCS_PUBLIC=true.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const { AppError, ERROR_CODES, ROLES } = require('@eduelderly/shared');
const { logger } = require('./logger');

const SERVICES = [
  { key: 'auth', name: 'Auth', envVar: 'AUTH_SERVICE_URL' },
  { key: 'user', name: 'User', envVar: 'USER_SERVICE_URL' },
  { key: 'course', name: 'Course', envVar: 'COURSE_SERVICE_URL' },
  { key: 'enrollment', name: 'Enrollment', envVar: 'ENROLLMENT_SERVICE_URL' },
  { key: 'quiz', name: 'Quiz', envVar: 'QUIZ_SERVICE_URL' },
  { key: 'payment', name: 'Payment', envVar: 'PAYMENT_SERVICE_URL' },
  { key: 'notification', name: 'Notification', envVar: 'NOTIFICATION_SERVICE_URL' },
  { key: 'certificate', name: 'Certificate', envVar: 'CERTIFICATE_SERVICE_URL' },
  { key: 'admin', name: 'Admin', envVar: 'ADMIN_SERVICE_URL' },
];

const SPEC_CACHE_TTL_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 3000;
const specCache = new Map();

const docsArePublic = () =>
  process.env.NODE_ENV !== 'production' || process.env.DOCS_PUBLIC === 'true';

const requireAdminJwt = (req, _res, next) => {
  if (docsArePublic()) return next();

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new AppError('Admin token required to view API docs', 401, ERROR_CODES.E_AUTH_INVALID));
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_ACCESS_SECRET, {
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

const fetchSpec = async (service) => {
  const cached = specCache.get(service.key);
  if (cached && cached.expiresAt > Date.now()) return cached.spec;

  const baseUrl = process.env[service.envVar];
  if (!baseUrl) throw new AppError(`${service.key} URL not configured`, 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/docs.json`, { signal: controller.signal });
    if (!response.ok) {
      throw new AppError(`${service.key} docs responded ${response.status}`, 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
    }
    const spec = await response.json();
    specCache.set(service.key, { spec, expiresAt: Date.now() + SPEC_CACHE_TTL_MS });
    return spec;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn(`Could not load OpenAPI spec for ${service.key}: ${error.message}`);
    throw new AppError(`${service.key} docs unavailable`, 503, ERROR_CODES.E_SERVICE_UNAVAILABLE);
  } finally {
    clearTimeout(timeout);
  }
};

const createDocsRouter = () => {
  const router = express.Router();

  // Swagger UI ships its own scripts and styles; the global helmet CSP would
  // block them, so the docs path opts out.
  router.use((_req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    next();
  });

  router.use(requireAdminJwt);

  router.get('/specs/:service', async (req, res, next) => {
    const key = req.params.service.replace(/\.json$/, '');
    const service = SERVICES.find((s) => s.key === key);
    if (!service) {
      return next(new AppError(`Unknown service '${key}'`, 404, ERROR_CODES.E_NOT_FOUND));
    }
    try {
      res.json(await fetchSpec(service));
    } catch (error) {
      next(error);
    }
  });

  router.use(
    '/',
    swaggerUi.serveFiles(null, {}),
    swaggerUi.setup(null, {
      explorer: true,
      customSiteTitle: 'EduElderly API docs',
      swaggerOptions: {
        urls: SERVICES.map((s) => ({ url: `/docs/specs/${s.key}.json`, name: s.name })),
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  );

  return router;
};

module.exports = { createDocsRouter, SERVICES };
