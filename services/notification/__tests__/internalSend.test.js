const request = require('supertest');
const { createApp } = require('../src/index');

jest.mock('../src/clients/brevoClient', () => ({
  sendTransactionalEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
}));

const { sendTransactionalEmail } = require('../src/clients/brevoClient');

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_KEY = 'test_internal_key';

const app = createApp();

describe('Notification Service - internal send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects missing service key', async () => {
    const res = await request(app)
      .post('/internal/send')
      .send({ email: 'user@test.com', type: 'otp', templateData: { otp: '123456' } });

    expect(res.status).toBe(401);
  });

  it('accepts valid otp payload and sends via Brevo client', async () => {
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
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: expect.stringContaining('login code'),
      }),
    );
  });
});
