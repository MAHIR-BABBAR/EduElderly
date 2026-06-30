const { catchAsync, toPublicNotificationDTO } = require('@eduelderly/shared');
const notificationService = require('../services/notification.service');

const listMyNotifications = catchAsync(async (req, res) => {
  const { notifications, pagination } = await notificationService.listForUser(
    req.user.userId,
    req.query,
  );

  res.status(200).json({
    success: true,
    data: {
      notifications: notifications.map(toPublicNotificationDTO),
      pagination,
    },
  });
});

const markNotificationRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.notificationId,
    req.user.userId,
  );

  res.status(200).json({
    success: true,
    data: toPublicNotificationDTO(notification),
  });
});

module.exports = { listMyNotifications, markNotificationRead };
