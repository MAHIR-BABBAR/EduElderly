const { createQueue, createWorker, getQueueStats, isQueueEnabled } = require('@eduelderly/shared');
const { deliverNotification } = require('../services/delivery.service');

const EMAIL_QUEUE = 'email';

let queue = null;

const getEmailQueue = () => {
  if (!queue) queue = createQueue(EMAIL_QUEUE);
  return queue;
};

/**
 * The job id is the notification id, so re-enqueueing the same notification
 * (for example after a crash between save and add) is a no-op.
 */
const enqueueEmail = (notificationId) =>
  getEmailQueue().add('send', { notificationId }, { jobId: notificationId });

const startEmailWorker = () =>
  createWorker(
    EMAIL_QUEUE,
    (job) =>
      deliverNotification(job.data.notificationId, {
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts ?? 1,
      }),
    { concurrency: 5 },
  );

const getEmailQueueStats = async () => {
  if (!isQueueEnabled()) return { enabled: false };
  return { enabled: true, ...(await getQueueStats(getEmailQueue())) };
};

module.exports = { EMAIL_QUEUE, enqueueEmail, startEmailWorker, getEmailQueueStats };
