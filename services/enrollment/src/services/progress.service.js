const { AppError, ERROR_CODES, XP_REWARDS } = require('@eduelderly/shared');
const { ENROLLMENT_STATUS } = require('@eduelderly/shared/constants/enrollmentStatus');
const { Enrollment } = require('../models/Enrollment');
const enrollmentService = require('./enrollment.service');
const courseClient = require('../clients/courseClient');
const userClient = require('../clients/userClient');
const { handleCourseCompletion } = require('./completion.service');

const syncCompletedModules = (enrollment, modules) => {
  const completedTopics = new Set(enrollment.completedTopics);
  const completedModules = [];

  for (const mod of modules) {
    if (mod.topicIds.length > 0 && mod.topicIds.every((id) => completedTopics.has(id))) {
      completedModules.push(mod.moduleId);
    }
  }

  enrollment.completedModules = completedModules;
};

const markTopicComplete = async (enrollmentId, userId, { topicId, timeSpentMinutes = 0 }) => {
  let enrollment = await enrollmentService.getEnrollmentForUser(enrollmentId, userId);

  if (enrollment.status !== ENROLLMENT_STATUS.ACTIVE) {
    throw new AppError('Enrollment is not active', 403, ERROR_CODES.E_NOT_ENROLLED);
  }

  const topic = await courseClient.getTopic(topicId);
  if (topic.courseId !== enrollment.courseId) {
    throw new AppError('Topic does not belong to this course', 400, ERROR_CODES.E_VALIDATION);
  }

  const stats = await courseClient.getCourseStats(enrollment.courseId);

  const topicUpdatePayload = {
    $addToSet: { completedTopics: topicId },
    $inc: { totalTimeSpentMinutes: timeSpentMinutes > 0 ? timeSpentMinutes : 0 },
    $set: {
      currentModuleId: topic.moduleId,
      currentLessonId: topicId,
      lastAccessedAt: new Date(),
    },
  };

  if (!enrollment.startedAt) {
    topicUpdatePayload.$set.startedAt = new Date();
  }

  const topicUpdate = await Enrollment.findOneAndUpdate(
    {
      enrollmentId,
      userId,
      status: ENROLLMENT_STATUS.ACTIVE,
      completedTopics: { $ne: topicId },
    },
    topicUpdatePayload,
    { new: true },
  );

  if (topicUpdate) {
    await userClient.incrementXP(userId, XP_REWARDS.TOPIC_COMPLETE);
    enrollment = topicUpdate;
  } else {
    enrollment = await enrollmentService.getEnrollmentForUser(enrollmentId, userId);
    if (timeSpentMinutes > 0) {
      enrollment.totalTimeSpentMinutes += timeSpentMinutes;
    }
    enrollment.currentModuleId = topic.moduleId;
    enrollment.currentLessonId = topicId;
    enrollment.lastAccessedAt = new Date();
    if (!enrollment.startedAt) {
      enrollment.startedAt = new Date();
    }
  }

  syncCompletedModules(enrollment, stats.modules || []);

  const topicCount = stats.topicCount || 0;
  if (topicCount > 0) {
    enrollment.progressPercent = Math.min(
      100,
      Math.round((enrollment.completedTopics.length / topicCount) * 100),
    );
  }

  if (enrollment.progressPercent >= 100 && enrollment.status === ENROLLMENT_STATUS.ACTIVE) {
    enrollment.status = ENROLLMENT_STATUS.COMPLETED;
    enrollment.completedAt = new Date();
    enrollment.progressPercent = 100;
  }

  await enrollment.save();

  if (enrollment.status === ENROLLMENT_STATUS.COMPLETED && !enrollment.courseCompletionXpAwarded) {
    const xpMarked = await Enrollment.findOneAndUpdate(
      { enrollmentId, courseCompletionXpAwarded: false },
      { $set: { courseCompletionXpAwarded: true } },
      { new: true },
    );
    if (xpMarked) {
      await userClient.incrementXP(userId, XP_REWARDS.COURSE_COMPLETE);
      enrollment.courseCompletionXpAwarded = true;
    }
  }

  if (enrollment.status === ENROLLMENT_STATUS.COMPLETED && enrollment.progressPercent >= 100) {
    handleCourseCompletion(enrollment, stats);
  }

  return enrollment;
};

const getTopicContent = async (enrollmentId, userId, topicId) => {
  const enrollment = await enrollmentService.getEnrollmentForUser(enrollmentId, userId);

  if (enrollment.status !== ENROLLMENT_STATUS.ACTIVE
    && enrollment.status !== ENROLLMENT_STATUS.COMPLETED) {
    throw new AppError('Not enrolled in this course', 403, ERROR_CODES.E_NOT_ENROLLED);
  }

  const topic = await courseClient.getTopic(topicId);
  if (topic.courseId !== enrollment.courseId) {
    throw new AppError('Topic does not belong to this course', 400, ERROR_CODES.E_VALIDATION);
  }

  enrollment.lastAccessedAt = new Date();
  await enrollment.save();

  return {
    topicId: topic.topicId,
    title: topic.title,
    contentType: topic.contentType,
    contentUrl: topic.contentUrl,
    durationMinutes: topic.durationMinutes,
  };
};

module.exports = { markTopicComplete, getTopicContent };
