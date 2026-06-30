const request = require('supertest');
const { createApp } = require('../src/index');
const { Certificate } = require('../src/models/Certificate');
const { ROLES } = require('@eduelderly/shared/constants/roles');

const app = createApp();

const learnerHeaders = {
  'x-user-id': 'learner-1',
  'x-user-role': ROLES.LEARNER,
};

const issuePayload = {
  userId: 'learner-1',
  courseId: 'course-1',
  userName: 'Jane Learner',
  courseTitle: 'Wellness Basics',
};

describe('Certificate Service', () => {
  describe('GET /internal/stats', () => {
    it('returns certificate count with service key', async () => {
      await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      const res = await request(app)
        .get('/internal/stats')
        .set('X-Service-Key', 'test_internal_key');

      expect(res.status).toBe(200);
      expect(res.body.data.totalCertificates).toBe(1);
    });

    it('rejects missing service key', async () => {
      const res = await request(app).get('/internal/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /internal/issue', () => {
    it('rejects missing service key', async () => {
      const res = await request(app).post('/internal/issue').send(issuePayload);
      expect(res.status).toBe(401);
    });

    it('issues a certificate', async () => {
      const res = await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.certId).toBeDefined();
      expect(res.body.data.verifyUrl).toContain('/api/v1/certificates/');
      expect(res.body.data.verifyUrl).toContain('/verify');
    });

    it('returns existing certificate on duplicate issue', async () => {
      const first = await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      const second = await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      expect(second.status).toBe(200);
      expect(second.body.data.certId).toBe(first.body.data.certId);

      const count = await Certificate.countDocuments({ userId: 'learner-1', courseId: 'course-1' });
      expect(count).toBe(1);
    });
  });

  describe('GET /:certId/verify', () => {
    it('returns valid response without auth', async () => {
      const issue = await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      const certId = issue.body.data.certId;
      const res = await request(app).get(`/${certId}/verify`);

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.courseTitle).toBe('Wellness Basics');
      expect(res.body.data.userName).toBe('Jane Learner');
    });

    it('returns valid false for unknown certId', async () => {
      const res = await request(app).get('/unknown-cert/verify');
      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
    });
  });

  describe('GET /me', () => {
    it('requires authenticated user', async () => {
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
    });

    it('lists certificates for user', async () => {
      await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      const res = await request(app).get('/me').set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].courseTitle).toBe('Wellness Basics');
    });
  });

  describe('GET /me/:certId/download', () => {
    it('returns PDF for certificate owner', async () => {
      const issue = await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      const certId = issue.body.data.certId;
      const res = await request(app)
        .get(`/me/${certId}/download`)
        .set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body.length).toBeGreaterThan(100);
    });

    it('returns 404 for non-owner', async () => {
      const issue = await request(app)
        .post('/internal/issue')
        .set('X-Service-Key', 'test_internal_key')
        .send(issuePayload);

      const certId = issue.body.data.certId;
      const res = await request(app)
        .get(`/me/${certId}/download`)
        .set({ 'x-user-id': 'other-user', 'x-user-role': ROLES.LEARNER });

      expect(res.status).toBe(404);
    });
  });
});
