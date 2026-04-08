/**
 * @param {Object} courseDoc - Mongoose Course document or plain object
 * @returns {Object} Safe course shape — no internal fields
 */
const toPublicCourseDTO = (courseDoc) => {
  const course = courseDoc.toObject ? courseDoc.toObject() : { ...courseDoc };
  return {
    courseId: course.courseId || course._id?.toString(),
    title: course.title,
    description: course.description,
    instructorId: course.instructorId,
    category: course.category,
    difficulty: course.difficulty,
    price: course.price,
    currency: course.currency || 'USD',
    durationMinutes: course.durationMinutes,
    isPublished: course.isPublished,
    thumbnailUrl: course.thumbnailUrl || null,
    totalModules: course.totalModules || 0,
    totalLessons: course.totalLessons || 0,
    tags: course.tags || [],
    prerequisites: course.prerequisites || [],
    learningOutcomes: course.learningOutcomes || [],
    rating: course.rating || { average: 0, count: 0 },
    enrollmentCount: course.enrollmentCount || 0,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
};

/**
 * @param {Object} courseDoc - Full course document for instructor view
 * @returns {Object} Shape with additional instructor details
 */
const toInstructorCourseDTO = (courseDoc) => {
  const base = toPublicCourseDTO(courseDoc);
  return {
    ...base,
    modules: courseDoc.modules || [],
    isDraft: courseDoc.isPublished === false,
    analytics: courseDoc.analytics || {
      totalRevenue: 0,
      completionRate: 0,
      avgTimeToComplete: 0,
    },
  };
};

module.exports = { toPublicCourseDTO, toInstructorCourseDTO };
