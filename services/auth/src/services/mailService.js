const { sendAuthEmail } = require('../clients/notificationClient');

const getAppUrl = () => process.env.APP_URL || 'http://localhost:5173';

const sendVerificationEmail = async (user, token) => {
  try {
    await sendAuthEmail({
      email: user.email,
      type: 'email_verification',
      templateData: {
        name: user.name,
        link: `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (error) {
    console.error('[auth-mail] Failed to send verification email:', error.message);
  }
};

const sendOtpEmail = async (user, otp) => {
  try {
    await sendAuthEmail({
      email: user.email,
      type: 'otp',
      templateData: { name: user.name, otp },
    });
  } catch (error) {
    console.error('[auth-mail] Failed to send otp email:', error.message);
  }
};

const sendPasswordResetEmail = async (user, token) => {
  try {
    await sendAuthEmail({
      email: user.email,
      type: 'password_reset',
      templateData: {
        name: user.name,
        link: `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`,
      },
    });
  } catch (error) {
    console.error('[auth-mail] Failed to send password reset email:', error.message);
  }
};

module.exports = {
  sendVerificationEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
};
