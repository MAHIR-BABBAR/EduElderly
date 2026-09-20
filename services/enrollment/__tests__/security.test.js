const request = require('supertest');
const { createApp } = require('../src/index');
const { ROLES } = require('@eduelderly/shared/constants/roles');

describe('Gateway trust security', () => {
  const originalGatewayTrustDisabled = process.env.GATEWAY_TRUST_DISABLED;
  const originalGatewayTrustEnforced = process.env.GATEWAY_TRUST_ENFORCED;

  afterEach(() => {
    if (originalGatewayTrustDisabled === undefined) {
      delete process.env.GATEWAY_TRUST_DISABLED;
    } else {
      process.env.GATEWAY_TRUST_DISABLED = originalGatewayTrustDisabled;
    }
    if (originalGatewayTrustEnforced === undefined) {
      delete process.env.GATEWAY_TRUST_ENFORCED;
    } else {
      process.env.GATEWAY_TRUST_ENFORCED = originalGatewayTrustEnforced;
    }
  });

  it('rejects spoofed user headers without service key when trust is enforced', async () => {
    delete process.env.GATEWAY_TRUST_DISABLED;
    process.env.GATEWAY_TRUST_ENFORCED = 'true';

    const app = createApp();
    const res = await request(app)
      .get('/')
      .set('X-User-Id', 'attacker-id')
      .set('X-User-Role', ROLES.LEARNER);

    expect(res.status).toBe(401);
  });

  it('allows requests with valid gateway key when trust is enforced', async () => {
    delete process.env.GATEWAY_TRUST_DISABLED;
    process.env.GATEWAY_TRUST_ENFORCED = 'true';

    const app = createApp();
    const res = await request(app)
      .get('/')
      // User routes are now proven by the gateway key, not the internal
      // service key (SEC-1). getGatewayKey() falls back to INTERNAL_SERVICE_KEY.
      .set('X-Gateway-Key', 'test_internal_key')
      .set('X-User-Id', 'learner-1')
      .set('X-User-Role', ROLES.LEARNER);

    expect(res.status).not.toBe(401);
  });

  it('rejects the internal service key on a user route when trust is enforced', async () => {
    delete process.env.GATEWAY_TRUST_DISABLED;
    process.env.GATEWAY_TRUST_ENFORCED = 'true';

    const app = createApp();
    const res = await request(app)
      .get('/')
      // The gateway holds only the gateway key; the internal key must not open
      // a user route, so a leaked internal key cannot impersonate the gateway.
      .set('X-Service-Key', 'test_internal_key')
      .set('X-User-Id', 'learner-1')
      .set('X-User-Role', ROLES.LEARNER);

    expect(res.status).toBe(401);
  });
});
