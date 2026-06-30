const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { AppError, ERROR_CODES, globalErrorHandler, requireGateway, assertRequiredEnv, requestId } = require('@eduelderly/shared');
const { initRedis, closeRedis, isRedisReady } = require('./utils/otpHelper');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const SERVICE_NAME = 'auth-service';

const createApp = () => {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.set('trust proxy', true);
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    const redisReady = isRedisReady();
    const healthy = dbReady && redisReady;
    res.status(healthy ? 200 : 503).json({
      service: SERVICE_NAME,
      status: healthy ? 'healthy' : 'unhealthy',
      database: dbReady ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'disconnected',
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
    if (!isRedisReady()) {
      return next(
        new AppError(
          'Cache unavailable, please wait',
          503,
          ERROR_CODES.E_SERVICE_UNAVAILABLE,
        ),
      );
    }
    next();
  });

  app.use(authRoutes);

  app.use((_req, _res, next) => {
    next(new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
  });

  app.use(globalErrorHandler);

  return app;
};

const bootstrap = async () => {
  const requiredEnvVars = [
    'MONGO_URI',
    'REDIS_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'INTERNAL_SERVICE_KEY',
    'USER_SERVICE_URL',
  ];
  assertRequiredEnv(requiredEnvVars, SERVICE_NAME);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'eduelderly-auth',
    });
    console.log(`[${SERVICE_NAME}] Connected to MongoDB`);

    await initRedis();
    console.log(`[${SERVICE_NAME}] Connected to Redis`);

    mongoose.connection.on('disconnected', () => {
      console.warn(`[${SERVICE_NAME}] MongoDB disconnected – requests will receive 503`);
    });
    mongoose.connection.on('error', (err) => {
      console.error(`[${SERVICE_NAME}] MongoDB connection error:`, err.message);
    });
    mongoose.connection.on('reconnected', () => {
      console.log(`[${SERVICE_NAME}] MongoDB reconnected – service restored`);
    });

    const app = createApp();
    const PORT = process.env.PORT || 3001;

    const server = app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log(`[${SERVICE_NAME}] Shutting down gracefully...`);
      server.close(async () => {
        console.log(`[${SERVICE_NAME}] Closed out remaining connections`);
        await closeRedis();
        console.log(`[${SERVICE_NAME}] Redis disconnected`);
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
