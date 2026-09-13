const userClient = require('../clients/userClient');
const notificationClient = require('../clients/notificationClient');

/**
 * Fire-and-forget welcome-to-course email. Course completion messaging lives in
 * certificateEligibility.service.js so there is a single owner for that decision.
 */
const notifyEnrollmentCreated = async (userId, courseTitle) => {
  try {
    const profileResponse = await userClient.getProfile(userId);
    const profile = profileResponse.data;
    if (profile?.email) {
      notificationClient.notifyEnroll({
        userId,
        email: profile.email,
        name: profile.name,
        courseTitle,
      });
    }
  } catch (error) {
    console.error('[enrollment] enroll notification failed:', error.message);
  }
};

module.exports = { notifyEnrollmentCreated };
