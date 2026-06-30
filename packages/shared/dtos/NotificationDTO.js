/**
 * @param {Object} notificationDoc - Mongoose Notification document or plain object
 * @returns {Object} Safe public notification shape
 */
const toPublicNotificationDTO = (notificationDoc) => {
  const n = notificationDoc.toObject ? notificationDoc.toObject() : { ...notificationDoc };
  return {
    notificationId: n.notificationId,
    userId: n.userId ?? null,
    type: n.type,
    channel: n.channel,
    subject: n.subject,
    body: n.body,
    status: n.status,
    isRead: n.isRead ?? false,
    sentAt: n.sentAt ?? null,
    createdAt: n.createdAt,
  };
};

module.exports = { toPublicNotificationDTO };
