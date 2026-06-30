const { serviceAuth } = require('./serviceAuth');

const isGatewayTrustEnforced = () => {
  if (process.env.GATEWAY_TRUST_DISABLED === 'true') {
    return false;
  }
  if (process.env.GATEWAY_TRUST_ENFORCED === 'true') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
};

/**
 * Ensures requests arrived via the API gateway (valid X-Service-Key).
 * Skipped when GATEWAY_TRUST_DISABLED=true (tests/local dev).
 * Enforced in production or when GATEWAY_TRUST_ENFORCED=true.
 */
const requireGateway = (req, res, next) => {
  if (!isGatewayTrustEnforced()) {
    return next();
  }
  return serviceAuth(req, res, next);
};

module.exports = { requireGateway, isGatewayTrustEnforced };
