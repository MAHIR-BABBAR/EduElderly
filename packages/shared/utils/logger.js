const createLogger = (serviceName) => {
  const log = (level, message, meta = {}) => {
    const entry = {
      level,
      service: serviceName,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
};

const requestId = (req, res, next) => {
  const id =
    req.get('X-Request-ID') ||
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

module.exports = { createLogger, requestId };
