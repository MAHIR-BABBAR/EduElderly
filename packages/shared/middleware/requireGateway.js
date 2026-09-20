const { serviceAuth } = require('./serviceAuth');
const { gatewayAuth } = require('./gatewayAuth');

const isGatewayTrustEnforced = () => {
  // The disable flag is a development convenience only; it must never weaken a
  // production deployment, so production ignores it entirely.
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  if (process.env.GATEWAY_TRUST_DISABLED === 'true') {
    return false;
  }
  if (process.env.GATEWAY_TRUST_ENFORCED === 'true') {
    return true;
  }
  return false;
};

/**
 * Guards user-facing routes: the request must have come through the gateway,
 * proven by the gateway key. `/internal` routes are excluded — they carry
 * their own service-key guard (`requireInternalAuth`) and are called
 * service-to-service, never through the gateway.
 *
 * Skipped entirely when gateway trust is not enforced (local dev / tests).
 */
const requireGateway = (req, res, next) => {
  if (req.path === '/internal' || req.path.startsWith('/internal/')) {
    return next();
  }
  if (!isGatewayTrustEnforced()) {
    return next();
  }
  return gatewayAuth(req, res, next);
};

/**
 * Guards `/internal` service-to-service routes with the internal service key.
 * The gateway does not hold this key, so these routes are unreachable from the
 * public edge even if the gateway's path filter regresses. Enforced under the
 * same conditions as gateway trust (i.e. in production).
 */
const requireInternalAuth = (req, res, next) => {
  if (!isGatewayTrustEnforced()) {
    return next();
  }
  return serviceAuth(req, res, next);
};

module.exports = { requireGateway, requireInternalAuth, isGatewayTrustEnforced };
