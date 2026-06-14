const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { AppError, ERROR_CODES, globalErrorHandler } = require('@eduelderly/shared');
const categoryRoutes = require('./routes/categoryRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const topicRoutes = require('./routes/topicRoutes');
const courseRoutes = require('./routes/courseRoutes');

dotenv.config();

const SERVICE_NAME = 'course-service';

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

  app.use('/categories', categoryRoutes);
  app.use('/', moduleRoutes);
  app.use('/', topicRoutes);
  app.use('/', courseRoutes);

  app.use((_req, _res, next) => {
    next(new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
  });

  app.use(globalErrorHandler);

  return app;
};

const bootstrap = async () => {
  const requiredEnvVars = ['MONGO_URI'];
  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      console.error(`[${SERVICE_NAME}] Missing required env var: ${key}`);
      process.exit(1);
    }
  });

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'eduelderly-course',
    });
    console.log(`[${SERVICE_NAME}] Connected to MongoDB`);

    mongoose.connection.on('disconnected', () => {
      console.warn(`[${SERVICE_NAME}] MongoDB disconnected – requests will receive 503`);
    });

    const app = createApp();
    const PORT = process.env.PORT || 3003;

    const server = app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log(`[${SERVICE_NAME}] Shutting down gracefully...`);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
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
