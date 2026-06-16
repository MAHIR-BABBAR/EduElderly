/**
 * Gateway Health Endpoint — Smoke Tests
 * Phase 0: Verifies the gateway starts and responds to health checks
 */

const request = require('supertest');

// Set env vars before importing app
process.env.PORT = '0'; // Let OS assign a random port
process.env.NODE_ENV = 'test';
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

describe('Gateway Health Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 with gateway status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'gateway');
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/:service', () => {
    it('should return 404 for an unknown service', async () => {
      const res = await request(app).get('/health/unknown-service');

      // Inside __tests__/health.test.js
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('message', "Service 'unknown-service' not found");
    });

    it('should accept valid service names', async () => {
      const validServices = [
        'auth',
        'user',
        'course',
        'enrollment',
        'quiz',
        'payment',
        'notification',
        'admin',
        'certificate',
      ];

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      try {
        for (const service of validServices) {
          const res = await request(app).get(`/health/${service}`);
          // Services are not running in test, so expect 503 (not 404)
          expect(res.status).toBe(503);
          expect(res.body).toHaveProperty('service', service);
          expect(res.body).toHaveProperty('status', 'unhealthy');
        }
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('GET /unknown-route', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/this-does-not-exist');

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('message', 'Route Not Found');
    });
  });
});
