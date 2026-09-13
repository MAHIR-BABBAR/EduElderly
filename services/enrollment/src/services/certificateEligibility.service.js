const { ENROLLMENT_STATUS } = require('@eduelderly/shared/constants/enrollmentStatus');
const { Enrollment } = require('../models/Enrollment');
const quizClient = require('../clients/quizClient');
const courseClient = require('../clients/courseClient');
const userClient = require('../clients/userClient');
const certificateClient = require('../clients/certificateClient');
const notificationClient = require('../clients/notificationClient');

/**
 * Loads the learner's display name and email for outbound messages.
 * Never throws — a missing profile only means no email is sent.
 */
const loadLearnerContact = async (userId) => {
  try {
    const profileResponse = await userClient.getProfile(userId);
    const profile = profileResponse?.data;
    return { userName: profile?.name || 'Learner', email: profile?.email || null };
  } catch (error) {
    console.error('[enrollment] could not load learner profile:', error.message);
    return { userName: 'Learner', email: null };
  }
};

/**
 * Single owner of the "course complete" decision.
 *
 * A certificate is issued only when BOTH conditions hold:
 *   1. the enrollment is `completed` (every topic marked done), and
 *   2. every published quiz for the course has a passing attempt.
 *
 * It is triggered from two places — the last lesson being marked complete, and a
 * passing quiz attempt — so it must be idempotent. The `certificateIssued` flag is
 * flipped with an atomic findOneAndUpdate, which guarantees the certificate email
 * is sent exactly once even if both triggers race.
 *
 * @param {string} userId
 * @param {string} courseId
 * @param {object} [options]
 * @param {boolean} [options.notifyOnIncomplete=false]
 *   When true and quizzes are still outstanding, send the learner a "lessons done,
 *   quizzes remaining" email. Only the lesson-completion trigger sets this, so the
 *   learner is not emailed after every individual quiz pass.
 */
const checkAndIssueCertificate = async (userId, courseId, { notifyOnIncomplete = false } = {}) => {
  const enrollment = await Enrollment.findOne({
    userId,
    courseId,
    status: ENROLLMENT_STATUS.COMPLETED,
  });

  if (!enrollment) {
    return { issued: false, reason: 'not_completed' };
  }

  if (enrollment.certificateIssued && enrollment.certificateId) {
    return { issued: true, certId: enrollment.certificateId, alreadyIssued: true };
  }

  const eligibility = await quizClient.getCourseQuizEligibility(userId, courseId);
  const stats = await courseClient.getCourseStats(courseId);
  const courseTitle = stats.title || 'Course';

  if (!eligibility.allPassed) {
    if (notifyOnIncomplete) {
      const { userName, email } = await loadLearnerContact(userId);
      if (email) {
        notificationClient.notifyCompletion({
          userId,
          email,
          name: userName,
          courseTitle,
          quizzesRemaining: eligibility.totalQuizzes - eligibility.passedCount,
        });
      }
    }
    return { issued: false, reason: 'quizzes_incomplete', eligibility };
  }

  const { userName, email } = await loadLearnerContact(userId);

  const cert = await certificateClient.issueCertificateSafe({
    userId,
    courseId,
    userName,
    courseTitle,
  });

  if (!cert?.certId) {
    return { issued: false, reason: 'issue_failed' };
  }

  // Atomic claim: only the first caller to flip the flag sends the email.
  const claimed = await Enrollment.findOneAndUpdate(
    { enrollmentId: enrollment.enrollmentId, certificateIssued: false },
    { $set: { certificateIssued: true, certificateId: cert.certId } },
    { new: true },
  );

  if (!claimed) {
    return { issued: true, certId: cert.certId, alreadyIssued: true };
  }

  if (email) {
    notificationClient.notifyCompletion({
      userId,
      email,
      name: userName,
      courseTitle,
      certId: cert.certId,
      verifyUrl: cert.verifyUrl,
    });
  }

  return { issued: true, certId: cert.certId };
};

module.exports = { checkAndIssueCertificate };
