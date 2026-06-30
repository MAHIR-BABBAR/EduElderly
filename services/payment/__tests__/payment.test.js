const request = require('supertest');
const { createApp } = require('../src/index');
const { ROLES } = require('@eduelderly/shared/constants/roles');
const { TX_STATUS } = require('@eduelderly/shared/constants/transactionTypes');
const enrollmentClient = require('../src/clients/enrollmentClient');

const app = createApp();

const serviceHeaders = {
  'x-service-key': 'test_internal_key',
};

const adminHeaders = {
  'x-user-id': 'admin-1',
  'x-user-role': ROLES.ADMIN,
};

const learnerHeaders = {
  'x-user-id': 'learner-1',
  'x-user-role': ROLES.LEARNER,
};

const otherLearnerHeaders = {
  'x-user-id': 'learner-2',
  'x-user-role': ROLES.LEARNER,
};

const createCheckout = async (overrides = {}) => {
  const res = await request(app)
    .post('/internal/checkout')
    .set(serviceHeaders)
    .send({
      userId: 'learner-1',
      courseId: 'course-paid-1',
      amount: 9.99,
      currency: 'USD',
      ...overrides,
    });

  return res;
};

describe('Payment Service', () => {
  beforeEach(() => {
    enrollmentClient.enrollAfterPayment.mockResolvedValue({
      enrollmentId: 'enr-1',
      userId: 'learner-1',
      courseId: 'course-paid-1',
      status: 'active',
    });
  });

  describe('POST /internal/checkout', () => {
    it('creates a pending transaction and returns orderId', async () => {
      const res = await createCheckout();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data).toHaveProperty('checkoutUrl');
      expect(res.body.data.checkoutUrl).toContain(res.body.data.orderId);
    });

    it('rejects duplicate pending checkout for same user and course', async () => {
      await createCheckout();
      const res = await createCheckout();

      expect(res.status).toBe(409);
    });

    it('rejects missing service key', async () => {
      const res = await request(app)
        .post('/internal/checkout')
        .send({ userId: 'learner-1', courseId: 'c1', amount: 5 });

      expect(res.status).toBe(401);
    });

    it('rejects incorrect payment amount', async () => {
      const courseClient = require('../src/clients/courseClient');
      courseClient.getCourse.mockResolvedValueOnce({
        courseId: 'course-paid-1',
        isPublished: true,
        isDeleted: false,
        isPaid: true,
        price: 9.99,
      });

      const res = await createCheckout({ amount: 0 });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /admin/orders/:orderId/status', () => {
    it('marks order success and enrolls learner', async () => {
      const checkoutRes = await createCheckout();
      const orderId = checkoutRes.body.data.orderId;

      const res = await request(app)
        .patch(`/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: TX_STATUS.SUCCESS });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TX_STATUS.SUCCESS);
      expect(enrollmentClient.enrollAfterPayment).toHaveBeenCalledWith({
        userId: 'learner-1',
        courseId: 'course-paid-1',
        paymentRef: orderId,
      });
    });

    it('marks order failed without enrolling', async () => {
      const checkoutRes = await createCheckout();
      const orderId = checkoutRes.body.data.orderId;

      const res = await request(app)
        .patch(`/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: TX_STATUS.FAILED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(TX_STATUS.FAILED);
      expect(enrollmentClient.enrollAfterPayment).not.toHaveBeenCalled();
    });

    it('is idempotent on repeated success', async () => {
      const checkoutRes = await createCheckout();
      const orderId = checkoutRes.body.data.orderId;

      await request(app)
        .patch(`/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: TX_STATUS.SUCCESS });

      const res = await request(app)
        .patch(`/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: TX_STATUS.SUCCESS });

      expect(res.status).toBe(200);
      expect(enrollmentClient.enrollAfterPayment).toHaveBeenCalledTimes(1);
    });

    it('keeps order pending when enrollment fails on confirm', async () => {
      const checkoutRes = await createCheckout();
      const orderId = checkoutRes.body.data.orderId;

      enrollmentClient.enrollAfterPayment.mockRejectedValueOnce(
        new Error('Enrollment service unavailable'),
      );

      const res = await request(app)
        .patch(`/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: TX_STATUS.SUCCESS });

      expect(res.status).toBeGreaterThanOrEqual(500);

      const orderRes = await request(app)
        .get(`/orders/${orderId}`)
        .set(learnerHeaders);

      expect(orderRes.status).toBe(200);
      expect(orderRes.body.data.status).toBe(TX_STATUS.PENDING);
    });

    it('rejects learner attempting status update', async () => {
      const checkoutRes = await createCheckout();
      const orderId = checkoutRes.body.data.orderId;

      const res = await request(app)
        .patch(`/admin/orders/${orderId}/status`)
        .set(learnerHeaders)
        .send({ status: TX_STATUS.SUCCESS });

      expect(res.status).toBe(403);
      expect(enrollmentClient.enrollAfterPayment).not.toHaveBeenCalled();
    });
  });

  describe('GET /internal/stats', () => {
    it('returns payment counts and revenue with service key', async () => {
      await createCheckout();
      const checkout2 = await createCheckout({ userId: 'learner-2', courseId: 'course-paid-2' });
      await request(app)
        .patch(`/admin/orders/${checkout2.body.data.orderId}/status`)
        .set(adminHeaders)
        .send({ status: TX_STATUS.SUCCESS });

      const res = await request(app).get('/internal/stats').set(serviceHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.totalOrders).toBe(2);
      expect(res.body.data.successfulOrders).toBe(1);
      expect(res.body.data.pendingOrders).toBe(1);
      expect(res.body.data.revenueTotal).toBe(9.99);
    });

    it('rejects missing service key', async () => {
      const res = await request(app).get('/internal/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /internal/status', () => {
    it('returns paid true after admin success', async () => {
      const checkoutRes = await createCheckout();
      const orderId = checkoutRes.body.data.orderId;

      await request(app)
        .patch(`/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: TX_STATUS.SUCCESS });

      const res = await request(app)
        .get('/internal/status')
        .set(serviceHeaders)
        .query({ userId: 'learner-1', courseId: 'course-paid-1' });

      expect(res.status).toBe(200);
      expect(res.body.data.paid).toBe(true);
      expect(res.body.data.orderId).toBe(orderId);
    });
  });

  describe('GET /transactions/me', () => {
    it('returns only the requesting user transactions', async () => {
      await createCheckout({ userId: 'learner-1' });
      await createCheckout({ userId: 'learner-2', courseId: 'course-paid-2' });

      const res = await request(app).get('/transactions/me').set(learnerHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions).toHaveLength(1);
      expect(res.body.data.transactions[0].userId).toBe('learner-1');
    });
  });

  describe('GET /orders/:orderId', () => {
    it('returns 403 when learner requests another user order', async () => {
      const checkoutRes = await createCheckout();
      const orderId = checkoutRes.body.data.orderId;

      const res = await request(app)
        .get(`/orders/${orderId}`)
        .set(otherLearnerHeaders);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /admin/orders', () => {
    it('lists pending orders for admin', async () => {
      await createCheckout();

      const res = await request(app)
        .get('/admin/orders')
        .set(adminHeaders)
        .query({ status: TX_STATUS.PENDING });

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.orders[0].status).toBe(TX_STATUS.PENDING);
      expect(res.body.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('paginates admin orders', async () => {
      await createCheckout({ userId: 'learner-1' });
      await createCheckout({ userId: 'learner-2', courseId: 'course-paid-2' });

      const res = await request(app)
        .get('/admin/orders')
        .set(adminHeaders)
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.orders).toHaveLength(1);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('rejects non-admin', async () => {
      const res = await request(app).get('/admin/orders').set(learnerHeaders);

      expect(res.status).toBe(403);
    });
  });
});
