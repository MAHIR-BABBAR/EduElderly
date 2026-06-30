const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { AppError, ERROR_CODES, globalErrorHandler, requireGateway, assertRequiredEnv, requestId } = require('@eduelderly/shared');
const internalRoutes = require('./routes/internalRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const SERVICE_NAME = 'admin-service';

const createApp = () => {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
      service: SERVICE_NAME,
      status: dbReady ? 'healthy' : 'unhealthy',
      database: dbReady ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use(requireGateway);
  app.use(requestId);

  app.use((req, _res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return next(
        new AppError(
          'Backend down, please wait',
          503,
          ERROR_CODES.E_SERVICE_UNAVAILABLE,
        ),
      );
    }
    next();
  });

  app.use('/internal', internalRoutes);
  app.use('/', adminRoutes);

  app.use((_req, _res, next) => {
    next(new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
  });

  app.use(globalErrorHandler);

  return app;
};

const bootstrap = async () => {
  assertRequiredEnv(['MONGO_URI', 'INTERNAL_SERVICE_KEY'], SERVICE_NAME);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'eduelderly-admin',
    });
    console.log(`[${SERVICE_NAME}] Connected to MongoDB`);

    const app = createApp();
    const PORT = process.env.PORT || 3008;

    const server = app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log(`[${SERVICE_NAME}] Shutting down gracefully...`);
      server.close(async () => {
        console.log(`[${SERVICE_NAME}] Closed out remaining connections`);
        await mongoose.disconnect();
        console.log(`[${SERVICE_NAME}] MongoDB disconnected`);
        process.exit(0);
      });

      setTimeout(() => {
        console.error(`[${SERVICE_NAME}] Could not close connections in time, forcefully shutting down`);
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start:`, error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  bootstrap();
}

module.exports = { createApp, bootstrap };
