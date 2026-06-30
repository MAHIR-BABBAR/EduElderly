require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { logger, requestLogger } = require('./logger');
const { setupProxy } = require('./proxy');
const { corsOptions } = require('./cors');
const { globalLimiter, authLimiter } = require('./rateLimiter');
const {
  AppError,
  ERROR_CODES,
  globalErrorHandler,
  assertRequiredEnv,
  getInternalServiceKey,
  requestId,
} = require('@eduelderly/shared');

const SERVICE_NAME = 'gateway';

const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(requestId);
  app.use(requestLogger);
  app.use(globalLimiter);
  app.use('/api/v1/auth', authLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({
      service: SERVICE_NAME,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/:service', async (req, res, next) => {
    const { service } = req.params;
    const serviceUrls = {
      auth: process.env.AUTH_SERVICE_URL,
      user: process.env.USER_SERVICE_URL,
      course: process.env.COURSE_SERVICE_URL,
      enrollment: process.env.ENROLLMENT_SERVICE_URL,
      quiz: process.env.QUIZ_SERVICE_URL,
      payment: process.env.PAYMENT_SERVICE_URL,
      notification: process.env.NOTIFICATION_SERVICE_URL,
      admin: process.env.ADMIN_SERVICE_URL,
      certificate: process.env.CERTIFICATE_SERVICE_URL,
    };

    const serviceUrl = serviceUrls[service];
    if (!serviceUrl) {
      return next(new AppError(`Service '${service}' not found`, 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
    }

    try {
      const response = await fetch(`${serviceUrl}/health`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        res.status(200).json({
          service,
          status: 'healthy',
          upstream: data,
        });
      } else {
        res.status(503).json({
          service,
          status: 'unhealthy',
          upstreamStatus: response.status,
        });
      }
    } catch (error) {
      logger.error(`Health check failed for ${service}:`, error.message);
      res.status(503).json({
        service,
        status: 'unhealthy',
        error: error.message,
      });
    }
  });

  setupProxy(app);

  app.use((_req, _res, next) => {
    next(new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
  });

  app.use(globalErrorHandler);

  return app;
};

const bootstrap = () => {
  assertRequiredEnv(
    [
      'JWT_ACCESS_SECRET',
      'INTERNAL_SERVICE_KEY',
      'AUTH_SERVICE_URL',
      'USER_SERVICE_URL',
      'COURSE_SERVICE_URL',
      'ENROLLMENT_SERVICE_URL',
      'QUIZ_SERVICE_URL',
      'PAYMENT_SERVICE_URL',
      'NOTIFICATION_SERVICE_URL',
      'ADMIN_SERVICE_URL',
      'CERTIFICATE_SERVICE_URL',
    ],
    SERVICE_NAME,
  );

  getInternalServiceKey();

  const app = createApp();
  const PORT = process.env.PORT || 8080;

  const server = app.listen(PORT, () => {
    logger.info(`Gateway service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  const shutdown = () => {
    logger.info(`${SERVICE_NAME} shutting down gracefully...`);
    server.close(() => {
      logger.info(`${SERVICE_NAME} closed out remaining connections`);
      process.exit(0);
    });

    setTimeout(() => {
      logger.error(`${SERVICE_NAME} could not close connections in time, forcefully shutting down`);
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

if (process.env.NODE_ENV === 'test') {
  module.exports = createApp();
} else if (require.main === module) {
  bootstrap();
} else {
  module.exports = createApp();
}
