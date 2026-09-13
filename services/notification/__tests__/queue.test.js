/**
 * End-to-end queue test. Runs only when a Redis URL is available (CI provides
 * one as a service container; locally `docker compose up -d redis` and set
 * REDIS_URL=redis://127.0.0.1:6379).
 */
const request = require('supertest');
const { Notification } = require('../src/models/Notification');

jest.mock('../src/clients/brevoClient', () => ({
  sendTransactionalEmail: jest.fn().mockResolvedValue({ messageId: 'queued-mock' }),
}));

const REDIS_URL = process.env.TEST_REDIS_URL || process.env.REDIS_URL;
const describeIfRedis = REDIS_URL ? describe : describe.skip;

const waitFor = async (predicate, { timeoutMs = 15000, intervalMs = 100 } = {}) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for condition');
};

describeIfRedis('Email queue (BullMQ)', () => {
  let app;
  let worker;
  let closeQueues;

  beforeAll(() => {
    process.env.REDIS_URL = REDIS_URL;
    process.env.QUEUE_ENABLED = 'true';
    ({ closeQueues } = require('@eduelderly/shared'));
    const { createApp } = require('../src/index');
    const { startEmailWorker } = require('../src/queue/emailQueue');
    app = createApp();
    worker = startEmailWorker();
  });

  afterAll(async () => {
    delete process.env.QUEUE_ENABLED;
    await worker.close();
    await closeQueues();
  });

  it('accepts the send with 202, then a worker delivers it', async () => {
    const res = await request(app)
      .post('/internal/send')
      .set('X-Service-Key', 'test_internal_key')
      .send({
        userId: 'learner-1',
        email: 'queued@test.com',
        type: 'enroll',
        templateData: { name: 'Queued', courseTitle: 'Async Course' },
      });

    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe('pending');
    const { notificationId } = res.body.data;

    const delivered = await waitFor(async () => {
      const n = await Notification.findOne({ notificationId });
      return n?.status === 'sent' ? n : null;
    });

    expect(delivered.sentAt).toBeTruthy();
    expect(delivered.attempts).toBe(1);
  }, 20000);

  it('exposes queue counts on the internal stats route', async () => {
    const res = await request(app)
      .get('/internal/queue/stats')
      .set('X-Service-Key', 'test_internal_key');

    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(true);
    expect(res.body.data.name).toBe('email');
    expect(typeof res.body.data.completed).toBe('number');
  });
});
