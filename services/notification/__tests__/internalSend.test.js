const request = require('supertest');
const { createApp } = require('../src/index');
const { Notification } = require('../src/models/Notification');
const { ROLES } = require('@eduelderly/shared/constants/roles');

jest.mock('../src/clients/brevoClient', () => ({
  sendTransactionalEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
}));

const { sendTransactionalEmail } = require('../src/clients/brevoClient');

const app = createApp();

const learnerHeaders = {
  'x-user-id': 'learner-1',
  'x-user-role': ROLES.LEARNER,
};

describe('Notification Service - internal send', () => {
  it('rejects missing service key', async () => {
    const res = await request(app)
      .post('/internal/send')
      .send({ email: 'user@test.com', type: 'otp', templateData: { otp: '123456' } });

    expect(res.status).toBe(401);
  });

  it('accepts valid otp payload, persists record, and sends via Brevo client', async () => {
    const res = await request(app)
      .post('/internal/send')
      .set('X-Service-Key', 'test_internal_key')
      .send({
        email: 'user@test.com',
        type: 'otp',
        templateData: { name: 'Test User', otp: '123456' },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notificationId).toBeDefined();
    expect(sendTransactionalEmail).toHaveBeenCalled();

    const saved = await Notification.findOne({ notificationId: res.body.data.notificationId });
    expect(saved).toBeTruthy();
    expect(saved.status).toBe('sent');
  });

  it('creates in-app notification when userId is provided', async () => {
    const res = await request(app)
      .post('/internal/send')
      .set('X-Service-Key', 'test_internal_key')
      .send({
        userId: 'learner-1',
        email: 'user@test.com',
        type: 'welcome',
        templateData: { name: 'Test User' },
      });

    expect(res.status).toBe(200);
    const saved = await Notification.findOne({ notificationId: res.body.data.notificationId });
    expect(saved.channel).toBe('both');
    expect(saved.userId).toBe('learner-1');
  });
});

describe('Notification Service - user routes', () => {
  const fixedNotificationId = 'notif-fixed-1';

  beforeEach(async () => {
    await Notification.create({
      notificationId: fixedNotificationId,
      userId: 'learner-1',
      type: 'enroll',
      channel: 'both',
      subject: 'Enrolled',
      body: 'You enrolled',
      status: 'sent',
      sentAt: new Date(),
    });
  });

  it('GET /me requires authenticated user', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
  });

  it('GET /me returns in-app notifications for user', async () => {
    const res = await request(app).get('/me').set(learnerHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0].type).toBe('enroll');
  });

  it('PATCH /me/:notificationId/read marks notification read', async () => {
    const res = await request(app)
      .patch(`/me/${fixedNotificationId}/read`)
      .set(learnerHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });
});
