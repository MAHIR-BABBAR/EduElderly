const { createLogger } = require('@eduelderly/shared');

const logger = createLogger('auth-mail');

const getAppUrl = () => process.env.APP_URL || 'http://localhost:5173';

const sendAuthEmailSafe = async (label, sendFn) => {
  try {
    await sendFn();
  } catch (error) {
    logger.error(`Failed to send ${label} email`, { error: error.message });
  }
};

const sendVerificationEmail = async (user, token) =>
  sendAuthEmailSafe('verification', () =>
    require('../clients/notificationClient').sendAuthEmail({
      email: user.email,
      userId: user.userId,
      type: 'email_verification',
      templateData: {
        name: user.name,
        link: `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`,
      },
    }),
  );

const sendOtpEmail = async (user, otp) =>
  sendAuthEmailSafe('otp', () =>
    require('../clients/notificationClient').sendAuthEmail({
      email: user.email,
      userId: user.userId,
      type: 'otp',
      templateData: { name: user.name, otp },
    }),
  );

const sendPasswordResetEmail = async (user, token) =>
  sendAuthEmailSafe('password reset', () =>
    require('../clients/notificationClient').sendAuthEmail({
      email: user.email,
      userId: user.userId,
      type: 'password_reset',
      templateData: {
        name: user.name,
        link: `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`,
      },
    }),
  );

const sendWelcomeEmail = async (user) =>
  sendAuthEmailSafe('welcome', () =>
    require('../clients/notificationClient').sendAuthEmail({
      email: user.email,
      userId: user.userId,
      type: 'welcome',
      templateData: {
        name: user.name,
        appUrl: getAppUrl(),
      },
    }),
  );

module.exports = {
  sendVerificationEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
