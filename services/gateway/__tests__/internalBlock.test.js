/**
 * SEC-1 — the gateway must never let a client reach a proxied service's
 * `/internal`, `/docs` or `/metrics` endpoint, whatever token they hold.
 *
 * Regression guard for a critical hole: the gateway stamps the real service
 * key onto every proxied request, so before this block a valid learner JWT
 * could call e.g. `POST /api/v1/enrollments/internal/enroll` or read
 * `GET /api/v1/payments/internal/stats`.
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

const { isBlockedEndpoint } = require('../src/authValidation');
const app = require('../src/index');

const learnerToken = () =>
  jwt.sign(
    { userId: 'user-1', role: 'learner' },
    process.env.JWT_ACCESS_SECRET,
    { issuer: 'eduelderly', audience: 'eduelderly-client', expiresIn: '1h' },
  );

describe('isBlockedEndpoint', () => {
  it('blocks /internal on every proxied service', () => {
    expect(isBlockedEndpoint('/api/v1/enrollments/internal/enroll')).toBe(true);
    expect(isBlockedEndpoint('/api/v1/courses/internal/topics/abc')).toBe(true);
    expect(isBlockedEndpoint('/api/v1/payments/internal/stats')).toBe(true);
    expect(isBlockedEndpoint('/api/v1/users/internal/sync')).toBe(true);
    expect(isBlockedEndpoint('/api/v1/certificates/internal/issue')).toBe(true);
  });

  it('blocks the bare /internal segment and operator surfaces', () => {
    expect(isBlockedEndpoint('/api/v1/courses/internal')).toBe(true);
    expect(isBlockedEndpoint('/api/v1/courses/docs')).toBe(true);
    expect(isBlockedEndpoint('/api/v1/admin/metrics')).toBe(true);
  });

  it('blocks percent-encoded evasions', () => {
    expect(isBlockedEndpoint('/api/v1/courses/%69nternal/x')).toBe(true);
    expect(isBlockedEndpoint('/api/v1/courses/INTERNAL')).toBe(true);
  });

  it('does not block legitimate public or user paths', () => {
    expect(isBlockedEndpoint('/api/v1/courses')).toBe(false);
    expect(isBlockedEndpoint('/api/v1/courses/abc-123')).toBe(false);
    expect(isBlockedEndpoint('/api/v1/enrollments')).toBe(false);
    // A course whose slug merely contains the word is fine.
    expect(isBlockedEndpoint('/api/v1/courses/internal-affairs-101')).toBe(false);
  });
});

describe('gateway blocks internal routes end-to-end', () => {
  it('returns 404 (not 401/403/proxied) for a learner JWT hitting /internal', async () => {
    const token = learnerToken();
    for (const path of [
      '/api/v1/enrollments/internal/enroll',
      '/api/v1/payments/internal/stats',
      '/api/v1/courses/internal/topics/abc',
    ]) {
      const res = await request(app).get(path).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    }
  });

  it('returns 404 for /internal even with no token', async () => {
    const res = await request(app).post('/api/v1/enrollments/internal/enroll');
    expect(res.status).toBe(404);
  });

  it('returns 404 for a per-service /docs shell', async () => {
    const res = await request(app).get('/api/v1/courses/docs');
    expect(res.status).toBe(404);
  });
});
