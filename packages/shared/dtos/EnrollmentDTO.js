/**
 * @param {Object} enrollmentDoc - Mongoose Enrollment document or plain object
 * @returns {Object} Safe enrollment shape — no internal fields
 */
const toPublicEnrollmentDTO = (enrollmentDoc) => {
  const enrollment = enrollmentDoc.toObject ? enrollmentDoc.toObject() : { ...enrollmentDoc };
  return {
    enrollmentId: enrollment.enrollmentId || enrollment._id?.toString(),
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    status: enrollment.status,
    progressPercent: enrollment.progressPercent || 0,
    completedModules: enrollment.completedModules || [],
    completedTopics: enrollment.completedTopics || [],
    currentModuleId: enrollment.currentModuleId,
    currentLessonId: enrollment.currentLessonId,
    enrolledAt: enrollment.enrolledAt,
    startedAt: enrollment.startedAt,
    completedAt: enrollment.completedAt,
    certificateIssued: enrollment.certificateIssued || false,
    certificateId: enrollment.certificateId || null,
    lastAccessedAt: enrollment.lastAccessedAt,
    totalTimeSpentMinutes: enrollment.totalTimeSpentMinutes || 0,
  };
};

/**
 * @param {Object} enrollmentDoc
 * @param {Object|null} courseSummary - { courseId, title, thumbnailUrl, instructorName } from course service
 */
const toEnrollmentWithCourseDTO = (enrollmentDoc, courseSummary = null) => {
  const base = toPublicEnrollmentDTO(enrollmentDoc);
  if (!courseSummary) {
    return base;
  }
  return {
    ...base,
    course: {
      courseId: courseSummary.courseId,
      title: courseSummary.title,
      thumbnailUrl: courseSummary.thumbnailUrl ?? null,
      instructorName: courseSummary.instructorName ?? null,
    },
  };
};

/**
 * Enrollment detail with optional course summary and resume fields (learn page / single fetch).
 * @param {Object} enrollmentDoc
 * @param {{ courseSummary?: Object|null, resume?: Object|null }} [options]
 */
const toEnrollmentDetailDTO = (enrollmentDoc, { courseSummary = null, resume = null } = {}) => {
  const withCourse = courseSummary
    ? toEnrollmentWithCourseDTO(enrollmentDoc, courseSummary)
    : toPublicEnrollmentDTO(enrollmentDoc);

  if (!resume) {
    return withCourse;
  }

  return {
    ...withCourse,
    nextTopicId: resume.nextTopicId ?? null,
    currentModuleId: resume.currentModuleId ?? null,
    currentLessonId: resume.currentLessonId ?? null,
  };
};

module.exports = {
  toPublicEnrollmentDTO,
  toEnrollmentWithCourseDTO,
  toEnrollmentDetailDTO,
};
