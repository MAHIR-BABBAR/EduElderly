const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { AppError, ERROR_CODES, globalErrorHandler } = require('@eduelderly/shared');
const internalRoutes = require('./routes/internalRoutes');

dotenv.config();

const SERVICE_NAME = 'notification-service';

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

  app.use('/internal', internalRoutes);

  app.use((_req, _res, next) => {
    next(new AppError('Route Not Found', 404, ERROR_CODES.E_NOT_FOUND));
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
      dbName: 'eduelderly-notification',
    });
    console.log(`[${SERVICE_NAME}] Connected to MongoDB`);

    const app = createApp();
    const PORT = process.env.PORT || 3007;

    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start:`, error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  bootstrap();
}

module.exports = { createApp, bootstrap };
