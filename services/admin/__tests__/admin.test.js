const request = require('supertest');
const { createApp } = require('../src/index');
const { ROLES } = require('@eduelderly/shared/constants/roles');
const { AUDIT_ACTION } = require('@eduelderly/shared/constants/auditActions');
const {
  userClient,
  courseClient,
  enrollmentClient,
  paymentClient,
  certificateClient,
} = require('../src/clients/statsClients');

const app = createApp();

const learnerHeaders = {
  'x-user-id': 'learner-1',
  'x-user-role': ROLES.LEARNER,
};

const adminHeaders = {
  'x-user-id': 'admin-1',
  'x-user-role': ROLES.ADMIN,
};

const mockStats = () => {
  userClient.getStats.mockResolvedValue({
    totalUsers: 10,
    activeUsers: 9,
    learners: 8,
    admins: 2,
  });
  courseClient.getStats.mockResolvedValue({
    totalCourses: 5,
    publishedCourses: 3,
    draftCourses: 2,
  });
  enrollmentClient.getStats.mockResolvedValue({
    totalEnrollments: 12,
    activeEnrollments: 8,
    completedEnrollments: 4,
  });
  paymentClient.getStats.mockResolvedValue({
    totalOrders: 6,
    successfulOrders: 4,
    pendingOrders: 2,
    revenueTotal: 1996,
    currency: 'USD',
  });
  certificateClient.getStats.mockResolvedValue({
    totalCertificates: 4,
  });
};

describe('Admin Service', () => {
  beforeEach(() => {
    mockStats();
  });

  describe('GET /dashboard', () => {
    it('returns 403 for learner', async () => {
      const res = await request(app).get('/dashboard').set(learnerHeaders);
      expect(res.status).toBe(403);
    });

    it('returns aggregated dashboard for admin', async () => {
      const res = await request(app).get('/dashboard').set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.users.total).toBe(10);
      expect(res.body.data.courses.published).toBe(3);
      expect(res.body.data.enrollments.completed).toBe(4);
      expect(res.body.data.revenue.total).toBe(1996);
      expect(res.body.data.completions).toBe(4);
      expect(res.body.data.certificates).toBe(4);
    });

    it('includes partialErrors when a downstream fetch fails', async () => {
      paymentClient.getStats.mockRejectedValue(new Error('payment down'));

      const res = await request(app).get('/dashboard').set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.revenue).toBeNull();
      expect(res.body.data.partialErrors).toEqual(
        expect.arrayContaining([expect.objectContaining({ service: 'payment' })]),
      );
    });
  });

  describe('GET /audit-logs', () => {
    it('returns 403 for learner', async () => {
      const res = await request(app).get('/audit-logs').set(learnerHeaders);
      expect(res.status).toBe(403);
    });

    it('returns audit logs for admin', async () => {
      await request(app)
        .post('/internal/audit-logs')
        .set('X-Service-Key', 'test_internal_key')
        .send({
          actorId: 'admin-1',
          action: AUDIT_ACTION.PUBLISH_COURSE,
          targetType: 'course',
          targetId: 'course-1',
        });

      const res = await request(app).get('/audit-logs').set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.logs).toHaveLength(1);
      expect(res.body.data.logs[0].action).toBe(AUDIT_ACTION.PUBLISH_COURSE);
    });
  });

  describe('POST /internal/audit-logs', () => {
    it('requires service key', async () => {
      const res = await request(app)
        .post('/internal/audit-logs')
        .send({
          actorId: 'admin-1',
          action: AUDIT_ACTION.CONFIRM_PAYMENT,
          targetType: 'order',
          targetId: 'order-1',
        });

      expect(res.status).toBe(401);
    });

    it('creates audit log with valid service key', async () => {
      const res = await request(app)
        .post('/internal/audit-logs')
        .set('X-Service-Key', 'test_internal_key')
        .send({
          actorId: 'admin-1',
          action: AUDIT_ACTION.CONFIRM_PAYMENT,
          targetType: 'order',
          targetId: 'order-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.auditId).toBeDefined();
    });
  });
});
