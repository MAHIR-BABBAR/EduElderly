const request = require('supertest');

process.env.PORT = '0';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret';
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
const { routeLabel } = require('../src/metrics');

describe('Gateway metrics', () => {
  it('labels requests by service prefix, not full path', () => {
    expect(routeLabel('/api/v1/courses/abc-123')).toBe('/api/v1/courses');
    expect(routeLabel('/api/v1/enrollments/e1/topics/t1/content')).toBe('/api/v1/enrollments');
    expect(routeLabel('/health/auth')).toBe('/health');
    expect(routeLabel('/docs/specs/auth.json')).toBe('docs');
    expect(routeLabel('/nope')).toBe('other');
  });

  it('exposes Prometheus metrics including request counters', async () => {
    await request(app).get('/health');
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds_bucket');
    expect(res.text).toMatch(/http_requests_total\{[^}]*route="\/health"[^}]*status="200"/);
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  it('requires an admin JWT in production', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(401);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
