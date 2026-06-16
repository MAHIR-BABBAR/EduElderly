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
 * @param {Object} enrollmentDoc - Enrollment with course details
 * @returns {Object} Shape with course information included
 */
const toEnrollmentWithCourseDTO = (enrollmentDoc) => {
  const base = toPublicEnrollmentDTO(enrollmentDoc);
  return {
    ...base,
    course: enrollmentDoc.courseId && typeof enrollmentDoc.courseId === 'object'
      ? {
          courseId: enrollmentDoc.courseId._id?.toString() || enrollmentDoc.courseId.courseId,
          title: enrollmentDoc.courseId.title,
          thumbnailUrl: enrollmentDoc.courseId.thumbnailUrl || null,
          instructorName: enrollmentDoc.courseId.instructorName,
        }
      : null,
  };
};

module.exports = { toPublicEnrollmentDTO, toEnrollmentWithCourseDTO };
