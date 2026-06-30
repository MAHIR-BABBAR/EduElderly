/**
 * Gateway Notification & Certificate Routes — Auth and routing smoke tests
 */

const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.PORT = '0';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-jwt-secret';
process.env.INTERNAL_SERVICE_KEY = 'test-internal-key';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001';
process.env.USER_SERVICE_URL = 'http://localhost:3002';
process.env.COURSE_SERVICE_URL = 'http://localhost:3003';
process.env.ENROLLMENT_SERVICE_URL = 'http://localhost:3004';
process.env.QUIZ_SERVICE_URL = 'http://localhost:3005';
process.env.PAYMENT_SERVICE_URL = 'http://localhost:3006';
process.env.NOTIFICATION_SERVICE_URL = 'http://localhost:3007';
process.env.ADMIN_SERVICE_URL = 'http://localhost:3008';
process.env.CERTIFICATE_SERVICE_URL = 'http://localhost:3009';

const app = require('../src/index');

const makeToken = (overrides = {}) =>
  jwt.sign(
    { userId: 'learner-1', role: 'learner', ...overrides },
    process.env.JWT_ACCESS_SECRET,
    { issuer: 'eduelderly', audience: 'eduelderly-client', expiresIn: '1h' },
  );

describe('Gateway Notification Routes', () => {
  it('returns 401 without a token for GET /api/v1/notifications/me', async () => {
    const res = await request(app).get('/api/v1/notifications/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('E_AUTH_INVALID');
  });

  it('accepts authenticated requests and proxies to notification service', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/v1/notifications/me')
      .set('Authorization', `Bearer ${token}`);

    expect([200, 503]).toContain(res.status);
    expect(res.status).not.toBe(404);
    expect(res.status).not.toBe(401);
  });
});

describe('Gateway Certificate Routes', () => {
  it('allows public GET /api/v1/certificates/:certId/verify without token', async () => {
    const res = await request(app).get('/api/v1/certificates/some-cert-id/verify');

    expect([200, 503]).toContain(res.status);
    expect(res.status).not.toBe(404);
    expect(res.status).not.toBe(401);
  });

  it('returns 401 without a token for GET /api/v1/certificates/me', async () => {
    const res = await request(app).get('/api/v1/certificates/me');
    expect(res.status).toBe(401);
  });

  it('accepts authenticated requests for GET /api/v1/certificates/me', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/api/v1/certificates/me')
      .set('Authorization', `Bearer ${token}`);

    expect([200, 503]).toContain(res.status);
    expect(res.status).not.toBe(404);
    expect(res.status).not.toBe(401);
  });
});
