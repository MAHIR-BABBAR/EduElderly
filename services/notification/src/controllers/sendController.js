const { AppError, ERROR_CODES, catchAsync } = require('@eduelderly/shared');
const { VALID_TYPES } = require('../templates');
const notificationService = require('../services/notification.service');

const sendInternalEmail = catchAsync(async (req, res) => {
  const { userId, email, type, templateData } = req.body;

  if (!type) {
    throw new AppError('type is required', 400, ERROR_CODES.E_VALIDATION);
  }

  if (!VALID_TYPES.includes(type)) {
    throw new AppError('Invalid email type', 400, ERROR_CODES.E_VALIDATION);
  }

  if (!email && !userId) {
    throw new AppError('email or userId is required', 400, ERROR_CODES.E_VALIDATION);
  }

  if (type === 'otp' && !templateData?.otp) {
    throw new AppError('templateData.otp is required for otp emails', 400, ERROR_CODES.E_VALIDATION);
  }

  if ((type === 'email_verification' || type === 'password_reset') && !templateData?.link) {
    throw new AppError('templateData.link is required for link emails', 400, ERROR_CODES.E_VALIDATION);
  }

  if (type === 'enroll' && !templateData?.courseTitle) {
    throw new AppError('templateData.courseTitle is required for enroll emails', 400, ERROR_CODES.E_VALIDATION);
  }

  const notification = await notificationService.sendNotification({
    userId,
    email,
    type,
    templateData,
  });

  res.status(200).json({
    success: true,
    message: 'Notification sent',
    data: { notificationId: notification.notificationId },
  });
});

module.exports = { sendInternalEmail };
