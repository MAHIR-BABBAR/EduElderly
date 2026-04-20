const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { AppError, ERROR_CODES, globalErrorHandler } = require('@eduelderly/shared');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const SERVICE_NAME = 'auth-service';

const createApp = () => {
  const app = express();
  
  app.use(express.json({ limit: '10mb' }));
  app.set('trust proxy', true);
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Health check
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

  // Database connectivity guard – returns 503 if Mongoose is not connected
  app.use((req, _res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return next(
        new AppError(
          'Backend down, please wait',
          503,
          ERROR_CODES.E_INTERNAL || 'E_SERVICE_UNAVAILABLE'
        )
      );
    }
    next();
  });

  // Routes 
  app.use(authRoutes);

  // 404 handler
  app.use((_req, _res, next) => {
    next(new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
  });

  // Global error handler 
  app.use(globalErrorHandler);

  return app;
};

const bootstrap = async () => {
  const requiredEnvVars = ['MONGO_URI'];
  // Check for essential env variables before attempting connection
  requiredEnvVars.forEach(key => {
    if (!process.env[key]) {
      console.error(`[${SERVICE_NAME}] Missing required env var: ${key}`);
      process.exit(1);
    }
  });

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'eduelderly-auth',
    });
    console.log(`[${SERVICE_NAME}] Connected to MongoDB`);

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

    // Graceful Shutdown
    const shutdown = async () => {
      console.log(`[${SERVICE_NAME}] Shutting down gracefully...`);
      server.close(async () => {
        console.log(`[${SERVICE_NAME}] Closed out remaining connections`);
        await mongoose.disconnect();
        console.log(`[${SERVICE_NAME}] MongoDB disconnected`);
        process.exit(0);
      });

      // Force close after 10 seconds
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

module.exports = { createApp };
