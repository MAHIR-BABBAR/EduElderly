const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { AppError, ERROR_CODES, globalErrorHandler } = require('@eduelderly/shared');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const SERVICE_NAME = 'enrollment-service';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    service: SERVICE_NAME,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// TODO Phase 3: Mount enrollment and lesson routes here
// app.use('/', enrollmentRoutes);
// app.use('/', lessonRoutes);

// 404 handler
app.use((_req, res, next) => {
  // We didn't find a route, so we CREATE a 404 error and pass it down
  next(new AppError('Route Not Found', 404, ERROR_CODES.E_ROUTE_NOT_FOUND));
});


// Global error handler (from shared package)
app.use(globalErrorHandler);


// Database connection & server start
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: 'eduelderly-enrollment',
    });
    console.log(`[${SERVICE_NAME}] Connected to MongoDB`);

    app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] Running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start:`, error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
