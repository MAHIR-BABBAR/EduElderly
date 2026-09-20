const { AppError, ERROR_CODES, isQueueEnabled } = require('@eduelderly/shared');
const {
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  SECRET_NOTIFICATION_TYPES,
} = require('@eduelderly/shared/constants/notificationTypes');
const { Notification } = require('../models/Notification');
const { renderEmail } = require('../templates');
const { deliverNotification } = require('./delivery.service');
const { enqueueEmail } = require('../queue/emailQueue');

const IN_APP_CHANNELS = [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.BOTH];

const resolveChannel = (userId, email) => {
  if (userId && email) return NOTIFICATION_CHANNEL.BOTH;
  if (userId) return NOTIFICATION_CHANNEL.IN_APP;
  return NOTIFICATION_CHANNEL.EMAIL;
};

const sendNotification = async ({ userId, email, type, templateData = {} }) => {
  if (!email && !userId) {
    throw new AppError('email or userId is required', 400, ERROR_CODES.E_VALIDATION);
  }

  const secret = SECRET_NOTIFICATION_TYPES.includes(type);
  if (secret && !email) {
    throw new AppError('email is required for this notification type', 400, ERROR_CODES.E_VALIDATION);
  }
  // A code or reset link is delivered to the inbox only; it is never listed
  // in the in-app feed, and it is not tied to the user record at all.
  const channel = secret ? NOTIFICATION_CHANNEL.EMAIL : resolveChannel(userId, email);
  const { subject, textContent } = renderEmail(type, templateData);

  const notification = await Notification.create({
    userId: secret ? null : userId || null,
    type,
    channel,
    subject,
    body: secret ? '[sent by email]' : textContent,
    payload: { email, templateData },
    status: NOTIFICATION_STATUS.PENDING,
  });

  const sendsEmail = channel === NOTIFICATION_CHANNEL.EMAIL
    || channel === NOTIFICATION_CHANNEL.BOTH;

  if (!sendsEmail) {
    notification.status = NOTIFICATION_STATUS.SENT;
    notification.sentAt = new Date();
    await notification.save();
    return notification;
  }

  if (!email) {
    throw new AppError('email is required for email notifications', 400, ERROR_CODES.E_VALIDATION);
  }

  // With Redis configured the email is delivered by a worker with retries and
  // the caller gets an immediate 202. Without it, deliver inline so the service
  // still works on a laptop with nothing but Mongo.
  if (isQueueEnabled()) {
    await enqueueEmail(notification.notificationId);
    return notification;
  }

  await deliverNotification(notification.notificationId, { attempt: 1, maxAttempts: 1 });
  return (await Notification.findOne({ notificationId: notification.notificationId })) ?? notification;
};

const listForUser = async (userId, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = {
    userId,
    channel: { $in: IN_APP_CHANNELS },
  };

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    notificationId,
    userId,
    channel: { $in: IN_APP_CHANNELS },
  });

  if (!notification) {
    throw new AppError('Notification not found', 404, ERROR_CODES.E_NOT_FOUND);
  }

  notification.isRead = true;
  await notification.save();
  return notification;
};

module.exports = { sendNotification, listForUser, markAsRead };
