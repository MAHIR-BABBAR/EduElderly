/**
 * Validates required environment variables at service startup.
 * Exits the process with code 1 if any are missing.
 */
const assertRequiredEnv = (keys, serviceName = 'service') => {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[${serviceName}] Missing required env var(s): ${missing.join(', ')}`);
    process.exit(1);
  }
};

const getInternalServiceKey = () => {
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (!key) {
    throw new Error('INTERNAL_SERVICE_KEY is not configured');
  }
  return key;
};

/**
 * The gateway key proves a request came through the gateway. It is distinct
 * from the internal service key so the gateway cannot reach `/internal` routes.
 * Falls back to the internal key when unset, so existing single-key
 * deployments keep working until they set a dedicated `GATEWAY_KEY`.
 */
const getGatewayKey = () => {
  const key = process.env.GATEWAY_KEY || process.env.INTERNAL_SERVICE_KEY;
  if (!key) {
    throw new Error('GATEWAY_KEY (or INTERNAL_SERVICE_KEY) is not configured');
  }
  return key;
};

module.exports = { assertRequiredEnv, getInternalServiceKey, getGatewayKey };
