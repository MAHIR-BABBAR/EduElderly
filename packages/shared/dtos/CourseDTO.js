/**
 * MVP public course shape — see .cursor/plans/course-service.md
 * @param {Object} courseDoc - Mongoose Course document or plain object
 * @returns {Object} Safe course shape for public API responses
 */
const toPublicCourseDTO = (courseDoc) => {
  const course = courseDoc.toObject ? courseDoc.toObject() : { ...courseDoc };
  const moduleIds = course.moduleIds || [];
  return {
    courseId: course.courseId,
    title: course.title,
    slug: course.slug,
    description: course.description,
    categoryId: course.categoryId,
    thumbnailUrl: course.thumbnailUrl || null,
    isPublished: Boolean(course.isPublished),
    isPaid: Boolean(course.isPaid),
    price: course.price ?? 0,
    difficulty: course.difficulty,
    estimatedHours: course.estimatedHours ?? 0,
    instructorName: course.instructorName,
    moduleCount: course.moduleCount ?? moduleIds.length,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
};

/**
 * @param {Object} courseDoc - Full course document for admin/instructor view
 * @param {Object} [options]
 * @param {Array} [options.modules]
 * @returns {Object} Admin course shape with nested content when provided
 */
const toInstructorCourseDTO = (courseDoc, { modules = [] } = {}) => {
  const base = toPublicCourseDTO(courseDoc);
  return {
    ...base,
    moduleIds: courseDoc.moduleIds || [],
    modules,
  };
};

module.exports = { toPublicCourseDTO, toInstructorCourseDTO };
