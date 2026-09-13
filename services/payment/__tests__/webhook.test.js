const request = require('supertest');
const { createApp } = require('../src/index');
const { TX_STATUS } = require('@eduelderly/shared/constants/transactionTypes');
const enrollmentClient = require('../src/clients/enrollmentClient');
const { MockProvider } = require('../src/providers/MockProvider');
const { Transaction } = require('../src/models/Transaction');

const app = createApp();
const serviceHeaders = { 'x-service-key': 'test_internal_key' };
const mock = new MockProvider();

const createCheckout = async () => {
  const res = await request(app)
    .post('/internal/checkout')
    .set(serviceHeaders)
    .send({ userId: 'learner-1', courseId: 'course-paid-1', amount: 9.99, currency: 'USD' });
  return res.body.data.orderId;
};

const postWebhook = (payload, { signature } = {}) => {
  const raw = JSON.stringify(payload);
  return request(app)
    .post('/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Webhook-Signature', signature ?? mock.sign(raw))
    .send(raw);
};

describe('POST /webhook (mock provider, HMAC signed)', () => {
  beforeEach(() => {
    process.env.PAYMENT_PROVIDER = 'mock';
    enrollmentClient.enrollAfterPayment.mockResolvedValue({ enrollmentId: 'enr-1' });
  });
  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
  });

  it('records provider details on checkout', async () => {
    const orderId = await createCheckout();
    const tx = await Transaction.findOne({ orderId });
    expect(tx.provider).toBe('mock');
    expect(tx.providerOrderId).toBe(`mock_${orderId}`);
    expect(tx.checkoutUrl).toContain(orderId);
  });

  it('captures a pending order: enrolls first, then marks paid', async () => {
    const orderId = await createCheckout();

    const res = await postWebhook({ event: 'payment.captured', orderId, paymentId: 'pay_1', eventId: 'evt_1' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({ orderId, status: TX_STATUS.SUCCESS, duplicate: false }));
    expect(enrollmentClient.enrollAfterPayment).toHaveBeenCalledWith({
      userId: 'learner-1',
      courseId: 'course-paid-1',
      paymentRef: orderId,
    });
    const tx = await Transaction.findOne({ orderId });
    expect(tx.status).toBe(TX_STATUS.SUCCESS);
    expect(tx.providerPaymentId).toBe('pay_1');
    expect(tx.statusUpdatedBy).toBe('webhook:mock');
  });

  it('is idempotent: a replayed capture is acknowledged without re-enrolling', async () => {
    const orderId = await createCheckout();
    const payload = { event: 'payment.captured', orderId, paymentId: 'pay_1', eventId: 'evt_1' };

    await postWebhook(payload);
    const replay = await postWebhook(payload);

    expect(replay.status).toBe(200);
    expect(replay.body.data.duplicate).toBe(true);
    expect(enrollmentClient.enrollAfterPayment).toHaveBeenCalledTimes(1);
  });

  it('rejects a bad signature and changes nothing', async () => {
    const orderId = await createCheckout();

    const res = await postWebhook({ event: 'payment.captured', orderId }, { signature: 'deadbeef' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('E_PAY_SIGNATURE');
    expect(enrollmentClient.enrollAfterPayment).not.toHaveBeenCalled();
    const tx = await Transaction.findOne({ orderId });
    expect(tx.status).toBe(TX_STATUS.PENDING);
  });

  it('marks a pending order failed on payment.failed', async () => {
    const orderId = await createCheckout();

    const res = await postWebhook({ event: 'payment.failed', orderId });

    expect(res.status).toBe(200);
    const tx = await Transaction.findOne({ orderId });
    expect(tx.status).toBe(TX_STATUS.FAILED);
    expect(enrollmentClient.enrollAfterPayment).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown order', async () => {
    const res = await postWebhook({ event: 'payment.captured', orderId: 'nope' });
    expect(res.status).toBe(404);
  });

  it('acknowledges events it does not handle', async () => {
    const orderId = await createCheckout();
    const res = await postWebhook({ event: 'refund.created', orderId });
    expect(res.status).toBe(200);
    expect(res.body.data.ignored).toBe(true);
  });

  it('leaves the order pending when enrollment fails, so the provider retries', async () => {
    const orderId = await createCheckout();
    enrollmentClient.enrollAfterPayment.mockRejectedValueOnce(new Error('enrollment down'));

    const res = await postWebhook({ event: 'payment.captured', orderId });

    expect(res.status).toBeGreaterThanOrEqual(500);
    const tx = await Transaction.findOne({ orderId });
    expect(tx.status).toBe(TX_STATUS.PENDING);
  });
});
