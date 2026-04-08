const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { logger, requestLogger } = require('./logger');
const { setupProxy } = require('./proxy');
const { corsOptions } = require('./cors');
const { globalLimiter, loginLimiter } = require('./rateLimiter');
const { AppError,ERROR_CODES,globalErrorHandler } = require('@eduelderly/shared');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security headers
app.use(helmet());

// CORS
app.use(cors(corsOptions));

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting - global (200 requests/minute)
app.use(globalLimiter);

// Rate limiting - login endpoint (10 requests/minute)
app.use('/api/v1/auth/login', loginLimiter);

// Health check for gateway itself
app.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Service health check proxy
app.get('/health/:service', async (req, res,next) => {
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
      headers: {
        'x-service-key': process.env.INTERNAL_SERVICE_KEY || 'internal-secret',
      },
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

// Setup proxy routes to all downstream services
setupProxy(app);

// 404 handler
app.use((_req, res, next) => {
  // We didn't find a route, so we CREATE a 404 error and pass it down
  next(new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
});


// Global error handler
app.use(globalErrorHandler)

// Only bind to the port if we are NOT running tests.
// Jest automatically sets NODE_ENV to 'test'.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Gateway service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Always export it so Supertest can use it
module.exports = app;