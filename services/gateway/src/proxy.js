/**
 * Gateway Proxy Configuration
 * Phase 0: Routes to all 9 downstream services
 */

const { createProxyMiddleware } = require('http-proxy-middleware');
const { logger } = require('./logger');
const { authValidation } = require('./authValidation');

// Service configuration
const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://auth:3001',
    pathRewrite: { '^/api/v1/auth': '' },
    changeOrigin: true,
  },
  users: {
    target: process.env.USER_SERVICE_URL || 'http://user:3002',
    pathRewrite: { '^/api/v1/users': '' },
    changeOrigin: true,
  },
  courses: {
    target: process.env.COURSE_SERVICE_URL || 'http://course:3003',
    pathRewrite: { '^/api/v1/courses': '' },
    changeOrigin: true,
  },
  enrollments: {
    target: process.env.ENROLLMENT_SERVICE_URL || 'http://enrollment:3004',
    pathRewrite: { '^/api/v1/enrollments': '' },
    changeOrigin: true,
  },
  quizzes: {
    target: process.env.QUIZ_SERVICE_URL || 'http://quiz:3005',
    pathRewrite: { '^/api/v1/quizzes': '' },
    changeOrigin: true,
  },
  payments: {
    target: process.env.PAYMENT_SERVICE_URL || 'http://payment:3006',
    pathRewrite: { '^/api/v1/payments': '' },
    changeOrigin: true,
  },
  notifications: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification:3007',
    pathRewrite: { '^/api/v1/notifications': '' },
    changeOrigin: true,
  },
  admin: {
    target: process.env.ADMIN_SERVICE_URL || 'http://admin:3008',
    pathRewrite: { '^/api/v1/admin': '' },
    changeOrigin: true,
  },
  certificates: {
    target: process.env.CERTIFICATE_SERVICE_URL || 'http://certificate:3009',
    pathRewrite: { '^/api/v1/certificates': '' },
    changeOrigin: true,
  },
};

// Proxy event handlers
const onProxyReq = (proxyReq, req, _res) => {
  // Remove Authorization header — downstream uses X-User-Id
  proxyReq.removeHeader('Authorization');

  // Add internal service key for inter-service authentication
  proxyReq.setHeader('X-Service-Key', process.env.INTERNAL_SERVICE_KEY || 'dev-key');

  // Forward request ID for tracing
  const requestId =
    req.get('X-Request-ID') ||
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  proxyReq.setHeader('X-Request-ID', requestId);

  // Forward user info if authenticated
  if (req.user) {
    proxyReq.setHeader('X-User-Id', req.user.userId);
    proxyReq.setHeader('X-User-Role', req.user.role);
  }
};

const onProxyRes = (proxyRes, req, _res) => {
  // Add CORS headers to proxied responses
  proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
  proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
};

const onError = (err, req, res, target) => {
  logger.error('Proxy Error', {
    error: err.message,
    target: target,
    path: req.path,
    method: req.method,
  });

  if (!res.headersSent) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The requested service is temporarily unavailable',
      },
    });
  }
};

/**
 * Creates a proxy middleware with shared event handlers
 */
const createProxy = (serviceConfig) => {
  return createProxyMiddleware({
    ...serviceConfig,
    onProxyReq,
    onProxyRes,
    onError,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'silent',
  });
};

/**
 * Mount all proxy routes on the Express app
 * Phase 0: authValidation is a stub that always returns 200
 */
const setupProxy = (app) => {
  // Global auth validation — skips public routes internally
  app.use(authValidation);

  app.use('/api/v1/auth', createProxy(services.auth));
  app.use('/api/v1/users', createProxy(services.users));
  app.use('/api/v1/courses', createProxy(services.courses));
  app.use('/api/v1/enrollments', createProxy(services.enrollments));
  app.use('/api/v1/quizzes', createProxy(services.quizzes));
  app.use('/api/v1/payments', createProxy(services.payments));
  app.use('/api/v1/notifications', createProxy(services.notifications));
  app.use('/api/v1/admin', createProxy(services.admin));
  app.use('/api/v1/certificates', createProxy(services.certificates));

  logger.info('Proxy routes mounted for all 9 services');
};

// Service URLs map for health checks
const serviceUrls = {
  auth: services.auth.target,
  user: services.users.target,
  course: services.courses.target,
  enrollment: services.enrollments.target,
  quiz: services.quizzes.target,
  payment: services.payments.target,
  notification: services.notifications.target,
  admin: services.admin.target,
  certificate: services.certificates.target,
};

module.exports = { setupProxy, serviceUrls };
