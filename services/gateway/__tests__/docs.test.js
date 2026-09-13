const request = require('supertest');
const jwt = require('jsonwebtoken');

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

const signToken = (role) =>
  jwt.sign({ userId: 'u1', role }, process.env.JWT_ACCESS_SECRET, {
    issuer: 'eduelderly',
    audience: 'eduelderly-client',
    expiresIn: '5m',
  });

describe('Gateway API docs', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete process.env.DOCS_PUBLIC;
  });

  it('serves the Swagger UI with a service picker', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('returns 404 for an unknown service spec', async () => {
    const res = await request(app).get('/docs/specs/nope.json');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 503 when the upstream service is down', async () => {
    const res = await request(app).get('/docs/specs/auth.json');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('E_SERVICE_UNAVAILABLE');
  });

  it('requires an admin JWT in production', async () => {
    process.env.NODE_ENV = 'production';

    const anonymous = await request(app).get('/docs/specs/auth.json');
    expect(anonymous.status).toBe(401);

    const learner = await request(app)
      .get('/docs/specs/auth.json')
      .set('Authorization', `Bearer ${signToken('learner')}`);
    expect(learner.status).toBe(403);

    const admin = await request(app)
      .get('/docs/specs/auth.json')
      .set('Authorization', `Bearer ${signToken('admin')}`);
    // Passes the gate; upstream is not running in tests.
    expect(admin.status).toBe(503);
  });

  it('can be opened publicly in production with DOCS_PUBLIC=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DOCS_PUBLIC = 'true';
    const res = await request(app).get('/docs/specs/nope.json');
    expect(res.status).toBe(404);
  });
});
