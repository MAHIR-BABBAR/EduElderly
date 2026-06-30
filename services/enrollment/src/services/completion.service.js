const userClient = require('../clients/userClient');
const certificateClient = require('../clients/certificateClient');
const notificationClient = require('../clients/notificationClient');

const handleCourseCompletion = async (enrollment, stats) => {
  try {
    const profileResponse = await userClient.getProfile(enrollment.userId);
    const profile = profileResponse.data;
    const userName = profile?.name || 'Learner';
    const email = profile?.email;
    const courseTitle = stats.title || 'Course';

    const cert = await certificateClient.issueCertificateSafe({
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      userName,
      courseTitle,
    });

    if (cert?.certId) {
      enrollment.certificateIssued = true;
      enrollment.certificateId = cert.certId;
      await enrollment.save();
    }

    if (email) {
      notificationClient.notifyCompletion({
        userId: enrollment.userId,
        email,
        name: userName,
        courseTitle,
        certId: cert?.certId,
        verifyUrl: cert?.verifyUrl,
      });
    }
  } catch (error) {
    console.error('[enrollment] course completion hook failed:', error.message);
  }
};

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

module.exports = { handleCourseCompletion, notifyEnrollmentCreated };
