const { Enrollment } = require('../models/Enrollment');
const { AppError, ERROR_CODES, createLogger } = require('@eduelderly/shared');
const { ENROLLMENT_STATUS } = require('@eduelderly/shared/constants/enrollmentStatus');
const courseClient = require('../clients/courseClient');
const paymentClient = require('../clients/paymentClient');
const { notifyEnrollmentCreated } = require('./completion.service');

const log = createLogger('enrollment-service');

const ACTIVE_STATUSES = [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED];

const courseSummaryFromStats = (stats) => ({
  courseId: stats.courseId,
  title: stats.title,
  thumbnailUrl: stats.thumbnailUrl ?? null,
  instructorName: stats.instructorName ?? null,
});

const computeResumeFields = (enrollment, stats) => {
  let nextTopicId = null;

  if (enrollment.status === ENROLLMENT_STATUS.ACTIVE) {
    const completedSet = new Set(enrollment.completedTopics);
    for (const module of stats.modules || []) {
      for (const topicId of module.topicIds) {
        if (!completedSet.has(topicId)) {
          nextTopicId = topicId;
          break;
        }
      }
      if (nextTopicId) break;
    }
  }

  return {
    nextTopicId,
    currentModuleId: enrollment.currentModuleId ?? null,
    currentLessonId: enrollment.currentLessonId ?? null,
  };
};

const fetchCourseSummary = async (courseId) => {
  const stats = await courseClient.getCourseStats(courseId);
  return courseSummaryFromStats(stats);
};

const findActiveEnrollment = async (userId, courseId) =>
  Enrollment.findOne({ userId, courseId, status: { $in: ACTIVE_STATUSES } });

const getEnrollmentForUser = async (enrollmentId, userId) => {
  const enrollment = await Enrollment.findOne({ enrollmentId, userId });
  if (!enrollment) {
    throw new AppError('Enrollment not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return enrollment;
};

const createEnrollmentRecord = async ({ userId, courseId, paymentRef = null }) => {
  const existing = await findActiveEnrollment(userId, courseId);
  if (existing) {
    throw new AppError('Already enrolled in this course', 409, ERROR_CODES.E_ALREADY_ENROLLED);
  }

  return Enrollment.create({
    userId,
    courseId,
    status: ENROLLMENT_STATUS.ACTIVE,
    enrolledAt: new Date(),
    paymentRef,
  });
};

const enroll = async (userId, courseId) => {
  const course = await courseClient.getCourse(courseId);

  if (!course.isPublished || course.isDeleted) {
    throw new AppError('Course not found', 404, ERROR_CODES.E_COURSE_NOT_FOUND);
  }

  const existing = await findActiveEnrollment(userId, courseId);
  if (existing) {
    throw new AppError('Already enrolled in this course', 409, ERROR_CODES.E_ALREADY_ENROLLED);
  }

  if (course.isPaid) {
    const checkout = await paymentClient.initiateCheckout({
      userId,
      courseId,
      amount: course.price,
    });
    return { requiresPayment: true, checkout };
  }

  const enrollment = await createEnrollmentRecord({ userId, courseId });
  notifyEnrollmentCreated(userId, course.title);
  return { enrollment };
};

const enrollAfterPayment = async ({ userId, courseId, paymentRef }) => {
  const course = await courseClient.getCourse(courseId);
  if (!course.isPublished || course.isDeleted) {
    throw new AppError('Course not found', 404, ERROR_CODES.E_COURSE_NOT_FOUND);
  }

  const existing = await findActiveEnrollment(userId, courseId);
  if (existing) {
    return existing;
  }

  const enrollment = await createEnrollmentRecord({ userId, courseId, paymentRef });
  notifyEnrollmentCreated(userId, course.title);
  log.info('Enrollment created after payment', { userId, courseId, paymentRef });
  return enrollment;
};

const listEnrollments = async (userId, { page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const filter = { userId, status: { $ne: ENROLLMENT_STATUS.DROPPED } };

  const [enrollments, total] = await Promise.all([
    Enrollment.find(filter).sort({ lastAccessedAt: -1, enrolledAt: -1 }).skip(skip).limit(safeLimit),
    Enrollment.countDocuments(filter),
  ]);

  return {
    enrollments,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const listEnrollmentsWithCourse = async (userId, query = {}) => {
  const { enrollments, pagination } = await listEnrollments(userId, query);
  const uniqueCourseIds = [...new Set(enrollments.map((e) => e.courseId))];

  const summaryEntries = await Promise.all(
    uniqueCourseIds.map(async (courseId) => {
      try {
        const summary = await fetchCourseSummary(courseId);
        return [courseId, summary];
      } catch {
        return [courseId, null];
      }
    }),
  );

  const summaryByCourseId = Object.fromEntries(summaryEntries);
  const items = enrollments.map((enrollment) => ({
    enrollment,
    courseSummary: summaryByCourseId[enrollment.courseId] ?? null,
  }));

  return { items, pagination };
};

const getEnrollment = async (enrollmentId, userId) => getEnrollmentForUser(enrollmentId, userId);

const getEnrollmentDetail = async (enrollmentId, userId) => {
  const enrollment = await getEnrollmentForUser(enrollmentId, userId);
  const stats = await courseClient.getCourseStats(enrollment.courseId);

  return {
    enrollment,
    courseSummary: courseSummaryFromStats(stats),
    resume: computeResumeFields(enrollment, stats),
  };
};

const getEnrollmentStatus = async (userId, courseId) => {
  const enrollment = await findActiveEnrollment(userId, courseId);
  return enrollment;
};

const dropEnrollment = async (enrollmentId, userId) => {
  const enrollment = await getEnrollmentForUser(enrollmentId, userId);
  if (enrollment.status === ENROLLMENT_STATUS.DROPPED) {
    return enrollment;
  }
  enrollment.status = ENROLLMENT_STATUS.DROPPED;
  await enrollment.save();
  return enrollment;
};

const getResume = async (enrollmentId, userId) => {
  const enrollment = await getEnrollmentForUser(enrollmentId, userId);
  if (enrollment.status !== ENROLLMENT_STATUS.ACTIVE) {
    throw new AppError('Enrollment is not active', 403, ERROR_CODES.E_NOT_ENROLLED);
  }

  const stats = await courseClient.getCourseStats(enrollment.courseId);
  const resume = computeResumeFields(enrollment, stats);

  return {
    enrollment,
    ...resume,
  };
};

const getEnrollmentStats = async () => {
  const [totalEnrollments, activeEnrollments, completedEnrollments] = await Promise.all([
    Enrollment.countDocuments({ status: { $ne: ENROLLMENT_STATUS.DROPPED } }),
    Enrollment.countDocuments({ status: ENROLLMENT_STATUS.ACTIVE }),
    Enrollment.countDocuments({ status: ENROLLMENT_STATUS.COMPLETED }),
  ]);

  return { totalEnrollments, activeEnrollments, completedEnrollments };
};

module.exports = {
  enroll,
  enrollAfterPayment,
  listEnrollments,
  listEnrollmentsWithCourse,
  getEnrollment,
  getEnrollmentDetail,
  getEnrollmentStatus,
  dropEnrollment,
  getResume,
  getEnrollmentForUser,
  findActiveEnrollment,
  getEnrollmentStats,
};
