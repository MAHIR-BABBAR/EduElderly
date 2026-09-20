const { Course } = require('../models/Course');
const { Module } = require('../models/Module');
const { Topic } = require('../models/Topic');
const { Category } = require('../models/Category');
const { AppError, ERROR_CODES, cache } = require('@eduelderly/shared');
const { slugify } = require('../utils/slug');

/**
 * Public catalog reads are cached in Redis under the `course:` prefix for
 * CATALOG_CACHE_TTL_SECONDS (default 60). Any write in this service, or in
 * the module, topic, or category services, calls invalidateCatalogCache().
 */
const CATALOG_PREFIX = 'course:';
const catalogTtl = () => parseInt(process.env.CATALOG_CACHE_TTL_SECONDS, 10) || 60;
const invalidateCatalogCache = () => cache.invalidatePrefix(CATALOG_PREFIX);

const assertCategoryExists = async (categoryId) => {
  const category = await Category.findOne({ categoryId });
  if (!category) {
    throw new AppError('Category not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return category;
};

const getActiveCourse = async (courseId, { publishedOnly = false } = {}) => {
  const filter = { courseId, isDeleted: false };
  if (publishedOnly) filter.isPublished = true;

  const course = await Course.findOne(filter);
  if (!course) {
    throw new AppError('Course not found', 404, ERROR_CODES.E_NOT_FOUND);
  }
  return course;
};

const SORTS = {
  newest: { createdAt: -1 },
  'a-z': { title: 1 },
  // No enrollment counts live in this service; "popular" falls back to the
  // most recently updated courses until that signal exists.
  popular: { updatedAt: -1 },
};

/**
 * Normalise the public catalog query once, so the filter, the cache key and
 * the pagination all agree. Anything unrecognised is dropped rather than
 * passed into a Mongo filter (the validators reject it earlier anyway).
 */
const normaliseCatalogQuery = ({ page = 1, limit = 20, search, categoryId, difficulty, isPaid, sort } = {}) => ({
  page: Math.max(1, parseInt(page, 10) || 1),
  limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
  search: typeof search === 'string' ? search.trim().slice(0, 100) : '',
  categoryId: typeof categoryId === 'string' ? categoryId : '',
  difficulty: ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : '',
  isPaid: isPaid === true || isPaid === 'true' ? true : isPaid === false || isPaid === 'false' ? false : null,
  sort: Object.keys(SORTS).includes(sort) ? sort : 'newest',
});

const loadPublishedCourses = async (rawQuery) => {
  const q = normaliseCatalogQuery(rawQuery);
  const safePage = q.page;
  const safeLimit = q.limit;
  const skip = (safePage - 1) * safeLimit;
  const filter = { isPublished: true, isDeleted: false };
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.difficulty) filter.difficulty = q.difficulty;
  if (q.isPaid !== null) filter.isPaid = q.isPaid;
  // $text uses the title+description index; never a $regex over user input.
  if (q.search) filter.$text = { $search: q.search };

  const sort = q.search && q.sort === 'newest' ? { score: { $meta: 'textScore' } } : SORTS[q.sort];
  const projection = q.search ? { score: { $meta: 'textScore' } } : undefined;

  const [courses, total] = await Promise.all([
    Course.find(filter, projection).sort(sort).skip(skip).limit(safeLimit),
    Course.countDocuments(filter),
  ]);

  const courseIds = courses.map((c) => c.courseId);
  const topicCounts = courseIds.length
    ? await Topic.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ])
    : [];
  const countByCourse = Object.fromEntries(topicCounts.map((r) => [r._id, r.count]));

  return {
    courses: courses.map((c) => ({
      ...c.toObject(),
      totalTopics: countByCourse[c.courseId] || 0,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const listAdminCourses = async ({ page = 1, limit = 20, isPublished, categoryId } = {}) => {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;
  const filter = { isDeleted: false };
  if (isPublished !== undefined) filter.isPublished = isPublished === 'true' || isPublished === true;
  if (categoryId) filter.categoryId = categoryId;

  const [courses, total] = await Promise.all([
    Course.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(safeLimit),
    Course.countDocuments(filter),
  ]);

  const courseIds = courses.map((c) => c.courseId);
  const topicCounts = courseIds.length
    ? await Topic.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ])
    : [];
  const countByCourse = Object.fromEntries(topicCounts.map((r) => [r._id, r.count]));

  return {
    courses: courses.map((c) => ({
      ...c.toObject(),
      totalTopics: countByCourse[c.courseId] || 0,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const loadCourseDetail = async (courseId, { publishedOnly = false }) => {
  const course = await getActiveCourse(courseId, { publishedOnly });
  const modules = await Module.find({ courseId }).sort({ order: 1 });
  const moduleIds = modules.map((m) => m.moduleId);
  const topics = await Topic.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });

  const topicsByModule = topics.reduce((acc, topic) => {
    if (!acc[topic.moduleId]) acc[topic.moduleId] = [];
    acc[topic.moduleId].push(topic);
    return acc;
  }, {});

  const modulesWithTopics = modules.map((mod) => ({
    ...mod.toObject(),
    topics: topicsByModule[mod.moduleId] || [],
  }));

  return { course, modules: modulesWithTopics, totalTopics: topics.length };
};

const loadCourseStats = async (courseId, { publishedOnly = false } = {}) => {
  const course = await getActiveCourse(courseId, { publishedOnly });
  const modules = await Module.find({ courseId });
  const moduleIds = modules.map((m) => m.moduleId);
  const topics = await Topic.find({ moduleId: { $in: moduleIds } });

  const topicsByModule = topics.reduce((acc, topic) => {
    if (!acc[topic.moduleId]) acc[topic.moduleId] = [];
    acc[topic.moduleId].push(topic.topicId);
    return acc;
  }, {});

  return {
    courseId: course.courseId,
    title: course.title,
    thumbnailUrl: course.thumbnailUrl || null,
    instructorName: course.instructorName,
    categoryId: course.categoryId || null,
    estimatedHours: course.estimatedHours ?? null,
    isPublished: course.isPublished,
    isDeleted: course.isDeleted,
    isPaid: course.isPaid,
    price: course.price,
    moduleCount: modules.length,
    topicCount: topics.length,
    topicIds: topics.map((t) => t.topicId),
    modules: modules.map((m) => ({
      moduleId: m.moduleId,
      topicIds: topicsByModule[m.moduleId] || [],
    })),
  };
};


const listPublishedCourses = async (rawQuery = {}) => {
  const q = normaliseCatalogQuery(rawQuery);
  // Key from the normalised query so "?page=0001" and "?page=1" share an entry.
  const key = `${CATALOG_PREFIX}list:${[q.page, q.limit, q.sort, q.categoryId, q.difficulty, q.isPaid ?? '', q.search].join(':')}`;
  const { value, hit } = await cache.remember(key, catalogTtl(), async () => {
    const result = await loadPublishedCourses(q);
    return { ...result, courses: result.courses.map((c) => JSON.parse(JSON.stringify(c))) };
  });
  return { ...value, cacheHit: hit };
};

const getCourseDetail = async (courseId, { publishedOnly = false } = {}) => {
  if (!publishedOnly) return { ...(await loadCourseDetail(courseId, { publishedOnly })), cacheHit: false };
  const key = `${CATALOG_PREFIX}detail:${courseId}`;
  const { value, hit } = await cache.remember(key, catalogTtl(), async () => {
    const { course, modules, totalTopics } = await loadCourseDetail(courseId, { publishedOnly });
    return { course: JSON.parse(JSON.stringify(course)), modules: JSON.parse(JSON.stringify(modules)), totalTopics };
  });
  return { ...value, cacheHit: hit };
};

const getCourseStats = async (courseId, options = {}) => {
  const key = `${CATALOG_PREFIX}stats:${courseId}:${options.publishedOnly ? 'pub' : 'any'}`;
  const { value } = await cache.remember(key, catalogTtl(), () => loadCourseStats(courseId, options));
  return value;
};

// Fields an admin may set directly. Publication goes through /publish (which
// writes the audit log), soft-deletion through DELETE; ids are never client-set.
const WRITABLE_COURSE_FIELDS = [
  'title', 'description', 'categoryId', 'thumbnailUrl', 'isPaid', 'price',
  'difficulty', 'estimatedHours', 'instructorName', 'credits', 'slug',
];
const pickWritable = (input = {}) =>
  Object.fromEntries(Object.entries(input).filter(([key]) => WRITABLE_COURSE_FIELDS.includes(key)));

const createCourse = async (rawPayload) => {
  const payload = pickWritable(rawPayload);
  await assertCategoryExists(payload.categoryId);
  const slug = payload.slug || slugify(payload.title);
  const existing = await Course.findOne({ slug, isDeleted: false });
  if (existing) {
    throw new AppError('Course slug already exists', 400, ERROR_CODES.E_VALIDATION);
  }

  const course = await Course.create({
    ...payload,
    slug,
    moduleIds: [],
  });
  await invalidateCatalogCache();
  return course;
};

const updateCourse = async (courseId, payload) => {
  const course = await getActiveCourse(courseId);
  const updates = pickWritable(payload);

  if (updates.categoryId) {
    await assertCategoryExists(updates.categoryId);
  }

  if (updates.title && !updates.slug) {
    updates.slug = slugify(updates.title);
  }

  if (updates.slug) {
    const conflict = await Course.findOne({
      slug: updates.slug,
      courseId: { $ne: courseId },
      isDeleted: false,
    });
    if (conflict) {
      throw new AppError('Course slug already exists', 400, ERROR_CODES.E_VALIDATION);
    }
  }

  delete updates.courseId;
  delete updates.moduleIds;

  Object.assign(course, updates);
  await course.save();
  await invalidateCatalogCache();
  return course;
};

const togglePublish = async (courseId, isPublished) => {
  const course = await getActiveCourse(courseId);
  course.isPublished = Boolean(isPublished);
  await course.save();
  await invalidateCatalogCache();
  return course;
};

const softDeleteCourse = async (courseId) => {
  const course = await getActiveCourse(courseId);
  course.isDeleted = true;
  course.isPublished = false;
  await course.save();
  await invalidateCatalogCache();
  return course;
};

const getCatalogStats = async () => {
  const baseFilter = { isDeleted: false };
  const [totalCourses, publishedCourses] = await Promise.all([
    Course.countDocuments(baseFilter),
    Course.countDocuments({ ...baseFilter, isPublished: true }),
  ]);

  return {
    totalCourses,
    publishedCourses,
    draftCourses: totalCourses - publishedCourses,
  };
};

module.exports = {
  listPublishedCourses,
  listAdminCourses,
  getCourseDetail,
  getCourseStats,
  getCatalogStats,
  createCourse,
  updateCourse,
  togglePublish,
  softDeleteCourse,
  getActiveCourse,
  invalidateCatalogCache,
};
