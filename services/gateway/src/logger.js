/**
 * Gateway Logger Configuration
 * Phase 0: Winston logger with console and file transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format (for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
    const serviceLabel = service ? `[${service}]` : '[gateway]';
    let msg = `${timestamp} ${level} ${serviceLabel}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logs directory path
const logsDir = path.join(__dirname, '../logs');

const fileTransports = [];
if (process.env.NODE_ENV === 'production') {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    fileTransports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 5,
      }),
    );
  } catch {
    // Fall back to console-only when the container user cannot write /app/logs
  }
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),

  defaultMeta: { service: 'gateway' },
  
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    ...fileTransports,
  ],
  exceptionHandlers: [
    new winston.transports.Console({ format: consoleFormat })
  ],
  rejectionHandlers: [
    new winston.transports.Console({ format: consoleFormat })
  ]
});

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.requestId || req.get('X-Request-ID') || 'none'
    });
  });
  
  next();
};

module.exports = { logger, requestLogger };
