const { createProxyMiddleware } = require('http-proxy-middleware');
const { logger } = require('./logger');
const { authValidation } = require('./authValidation');
const { ERROR_CODES } = require('@eduelderly/shared');
const { ROUTES_CONFIG } = require('../routes.config');



// Service configuration
const services = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: { '^/api/v1/auth': '' },
    changeOrigin: true,
  },
  users: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3002',
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


const onProxyReq = (proxyReq, req, _res) => {
  proxyReq.removeHeader('Authorization');
  proxyReq.setHeader('X-Service-Key', process.env.INTERNAL_SERVICE_KEY || 'dev-key');
  const requestId =
    req.get('X-Request-ID') || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  proxyReq.setHeader('X-Request-ID', requestId);

  if (req.user) {
    proxyReq.setHeader('X-User-Id', req.user.userId);
    proxyReq.setHeader('X-User-Role', req.user.role);
  }
};

const onProxyRes = (proxyRes, req, _res) => {
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
        code: ERROR_CODES.E_SERVICE_UNAVAILABLE,
        message: 'The requested service is temporarily unavailable',
      },
    });
  }
};

const createProxy = (target, prefix) => {
  return createProxyMiddleware({
    target,
    pathRewrite: { [`^${prefix}`]: '' },
    changeOrigin: true,
    on: {
      proxyReq: onProxyReq,
      proxyRes: onProxyRes,
      error: onError,
    },
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'silent',
  });
};

const setupProxy = app => {

  app.use(authValidation);
  for (const key in ROUTES_CONFIG) {
    const service = ROUTES_CONFIG[key];

    if (service.target) {
      app.use(service.prefix, createProxy(service.target, service.prefix));
    }
  }

  logger.info(`Proxy routes mounted dynamically for ${Object.keys(ROUTES_CONFIG).length - 1} services`);

};

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
