const { Enrollment } = require('../models/Enrollment');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ENROLLMENT_STATUS } = require('@eduelderly/shared/constants/enrollmentStatus');
const courseClient = require('../clients/courseClient');
const paymentClient = require('../clients/paymentClient');

const ACTIVE_STATUSES = [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED];

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

  return createEnrollmentRecord({ userId, courseId, paymentRef });
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

const getEnrollment = async (enrollmentId, userId) => getEnrollmentForUser(enrollmentId, userId);

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
  const completedSet = new Set(enrollment.completedTopics);
  let nextTopicId = null;

  for (const module of stats.modules || []) {
    for (const topicId of module.topicIds) {
      if (!completedSet.has(topicId)) {
        nextTopicId = topicId;
        break;
      }
    }
    if (nextTopicId) break;
  }

  return {
    enrollment,
    nextTopicId,
    currentModuleId: enrollment.currentModuleId,
    currentLessonId: enrollment.currentLessonId,
  };
};

module.exports = {
  enroll,
  enrollAfterPayment,
  listEnrollments,
  getEnrollment,
  getEnrollmentStatus,
  dropEnrollment,
  getResume,
  getEnrollmentForUser,
  findActiveEnrollment,
};
