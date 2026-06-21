/**
 * Gateway Quiz Routes — Auth and routing smoke tests
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

describe('Gateway Quiz Routes', () => {
  describe('GET /api/v1/quizzes/attempts/me', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/v1/quizzes/attempts/me');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('E_AUTH_INVALID');
    });

    it('accepts authenticated requests and proxies to quiz service', async () => {
      const token = makeToken();
      const res = await request(app)
        .get('/api/v1/quizzes/attempts/me')
        .set('Authorization', `Bearer ${token}`);

      // Quiz service is not running in unit tests — proxy returns 503
      expect([200, 503]).toContain(res.status);
      expect(res.status).not.toBe(404);
      expect(res.status).not.toBe(401);
    });
  });

  describe('unknown quiz sub-routes', () => {
    it('does not return 404 for known quiz prefix', async () => {
      const token = makeToken();
      const res = await request(app)
        .get('/api/v1/quizzes/some-quiz-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).not.toBe(404);
    });
  });
});
