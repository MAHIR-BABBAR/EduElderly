/**
 * @param {Object} topicDoc
 * @returns {Object} Public topic shape (catalog/detail for learners)
 */
const toPublicTopicDTO = (topicDoc) => {
  const topic = topicDoc.toObject ? topicDoc.toObject() : { ...topicDoc };
  return {
    topicId: topic.topicId,
    title: topic.title,
    contentType: topic.contentType,
    contentUrl: topic.contentUrl || null,
    durationMinutes: topic.durationMinutes ?? 0,
    order: topic.order,
  };
};

/**
 * @param {Object} moduleDoc
 * @param {Array} [topics]
 * @returns {Object} Public module shape with nested topics
 */
const toPublicModuleDTO = (moduleDoc, topics = []) => {
  const mod = moduleDoc.toObject ? moduleDoc.toObject() : { ...moduleDoc };
  const topicList = topics.map((t) => toPublicTopicDTO(t));
  return {
    moduleId: mod.moduleId,
    title: mod.title,
    order: mod.order,
    topicCount: topicList.length,
    topics: topicList,
  };
};

/**
 * MVP public course shape — see .cursor/plans/course-service.md
 * @param {Object} courseDoc - Mongoose Course document or plain object
 * @param {Object} [options]
 * @param {number} [options.totalTopics]
 * @returns {Object} Safe course shape for public API responses
 */
const toPublicCourseDTO = (courseDoc, { totalTopics } = {}) => {
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
    totalTopics: totalTopics ?? course.totalTopics ?? 0,
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

module.exports = {
  toPublicCourseDTO,
  toPublicModuleDTO,
  toPublicTopicDTO,
  toInstructorCourseDTO,
};
