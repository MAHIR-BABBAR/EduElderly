const NOTIFICATION_TYPE = Object.freeze({
  // Auth emails
  OTP: 'otp',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  // Learner notifications
  WELCOME: 'welcome',
  ENROLL: 'enroll',
  QUIZ_RESULT: 'quiz_result',
  COMPLETION: 'completion',
});

const NOTIFICATION_TYPE_VALUES = Object.freeze(Object.values(NOTIFICATION_TYPE));

const NOTIFICATION_CHANNEL = Object.freeze({
  EMAIL: 'email',
  IN_APP: 'in_app',
  BOTH: 'both',
});

const NOTIFICATION_CHANNEL_VALUES = Object.freeze(Object.values(NOTIFICATION_CHANNEL));

const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
});

const NOTIFICATION_STATUS_VALUES = Object.freeze(Object.values(NOTIFICATION_STATUS));

module.exports = {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_CHANNEL_VALUES,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_VALUES,
};
