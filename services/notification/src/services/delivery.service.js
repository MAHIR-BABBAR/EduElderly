const { NOTIFICATION_STATUS } = require('@eduelderly/shared/constants/notificationTypes');
const { createLogger } = require('@eduelderly/shared');
const { Notification } = require('../models/Notification');
const { sendTransactionalEmail } = require('../clients/brevoClient');
const { renderEmail } = require('../templates');

const log = createLogger('notification-delivery');

/**
 * Deliver one persisted notification by email.
 *
 * This is the queue processor, but it has no BullMQ dependency so it can run
 * inline (no Redis) and be unit tested directly. It is idempotent: a
 * notification that is already `sent` is skipped, which protects against a
 * job being retried after the send succeeded but before the status was saved.
 *
 * On failure the error is recorded and rethrown so the queue can retry with
 * backoff; the status only flips to `failed` on the final attempt.
 *
 * @param {string} notificationId
 * @param {{ attempt?: number, maxAttempts?: number }} [context]
 */
const deliverNotification = async (notificationId, { attempt = 1, maxAttempts = 1 } = {}) => {
  const notification = await Notification.findOne({ notificationId });
  if (!notification) {
    log.warn('Notification not found, skipping delivery', { notificationId });
    return { skipped: true, reason: 'not_found' };
  }
  if (notification.status === NOTIFICATION_STATUS.SENT) {
    return { skipped: true, reason: 'already_sent' };
  }

  const email = notification.payload?.email;
  if (!email) {
    notification.status = NOTIFICATION_STATUS.FAILED;
    notification.error = 'No email address on notification';
    await notification.save();
    return { skipped: true, reason: 'no_email' };
  }

  const { subject, htmlContent, textContent } = renderEmail(
    notification.type,
    notification.payload?.templateData || {},
  );

  try {
    await sendTransactionalEmail({ to: email, subject, htmlContent, textContent });
  } catch (error) {
    notification.attempts = attempt;
    notification.error = error.message;
    if (attempt >= maxAttempts) {
      notification.status = NOTIFICATION_STATUS.FAILED;
    }
    await notification.save();
    throw error;
  }

  notification.attempts = attempt;
  notification.error = null;
  notification.status = NOTIFICATION_STATUS.SENT;
  notification.sentAt = new Date();
  await notification.save();

  return { sent: true };
};

module.exports = { deliverNotification };
