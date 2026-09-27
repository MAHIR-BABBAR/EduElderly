const { Notification } = require('../src/models/Notification');

jest.mock('../src/clients/brevoClient', () => ({
  sendTransactionalEmail: jest.fn(),
}));

const { sendTransactionalEmail } = require('../src/clients/brevoClient');
const { deliverNotification } = require('../src/services/delivery.service');

const createPending = (overrides = {}) =>
  Notification.create({
    notificationId: `n-${Math.random().toString(36).slice(2)}`,
    userId: 'learner-1',
    type: 'enroll',
    channel: 'both',
    subject: 'Enrolled',
    body: 'You enrolled',
    payload: { email: 'user@test.com', templateData: { name: 'Test', courseTitle: 'Course' } },
    status: 'pending',
    ...overrides,
  });

describe('deliverNotification (queue processor)', () => {
  it('sends the email and marks the notification sent', async () => {
    sendTransactionalEmail.mockResolvedValueOnce({ messageId: 'm1' });
    const n = await createPending();

    const result = await deliverNotification(n.notificationId, { attempt: 1, maxAttempts: 5 });

    expect(result).toEqual({ sent: true });
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com', subject: expect.stringContaining('Course') }),
    );
    const saved = await Notification.findOne({ notificationId: n.notificationId });
    expect(saved.status).toBe('sent');
    expect(saved.sentAt).toBeTruthy();
    expect(saved.attempts).toBe(1);
  });

  it('keeps the notification pending and rethrows when a retry is still available', async () => {
    sendTransactionalEmail.mockRejectedValueOnce(new Error('Brevo 500'));
    const n = await createPending();

    await expect(
      deliverNotification(n.notificationId, { attempt: 2, maxAttempts: 5 }),
    ).rejects.toThrow('Brevo 500');

    const saved = await Notification.findOne({ notificationId: n.notificationId });
    expect(saved.status).toBe('pending');
    expect(saved.error).toBe('Brevo 500');
    expect(saved.attempts).toBe(2);
  });

  it('marks the notification failed on the final attempt', async () => {
    sendTransactionalEmail.mockRejectedValueOnce(new Error('Brevo down'));
    const n = await createPending();

    await expect(
      deliverNotification(n.notificationId, { attempt: 5, maxAttempts: 5 }),
    ).rejects.toThrow('Brevo down');

    const saved = await Notification.findOne({ notificationId: n.notificationId });
    expect(saved.status).toBe('failed');
    expect(saved.attempts).toBe(5);
  });

  it('is idempotent for notifications that were already sent', async () => {
    const n = await createPending({ status: 'sent', sentAt: new Date() });

    const result = await deliverNotification(n.notificationId);

    expect(result).toEqual({ skipped: true, reason: 'already_sent' });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('skips unknown notification ids without throwing', async () => {
    const result = await deliverNotification('does-not-exist');
    expect(result).toEqual({ skipped: true, reason: 'not_found' });
  });
});
