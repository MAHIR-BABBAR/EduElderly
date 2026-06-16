#!/usr/bin/env node
/**
 * Populate eduelderly-course DB from scripts/data/sample-courses.json
 *
 *   npm run seed         # upsert by slug
 *   npm run seed:reset   # wipe collections, then seed
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Category } = require('../src/models/Category');
const { Course } = require('../src/models/Course');
const { Module } = require('../src/models/Module');
const { Topic } = require('../src/models/Topic');
const { slugify } = require('../src/utils/slug');

const DATA_PATH = path.join(__dirname, 'data', 'sample-courses.json');
const isReset = process.argv.includes('--reset');

const loadData = () => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(DATA_PATH);
};

const wipeCollections = async () => {
  await Promise.all([
    Topic.deleteMany({}),
    Module.deleteMany({}),
    Course.deleteMany({}),
    Category.deleteMany({}),
  ]);
};

const upsertCategory = async (entry) => {
  const slug = entry.slug || slugify(entry.name);
  let category = await Category.findOne({ slug });
  if (!category) {
    category = await Category.create({
      name: entry.name,
      slug,
      description: entry.description || '',
    });
  } else {
    category.name = entry.name;
    category.description = entry.description || '';
    await category.save();
  }
  return category;
};

const upsertCourseTree = async (entry, categoryId) => {
  const slug = entry.slug || slugify(entry.title);
  let course = await Course.findOne({ slug, isDeleted: false });
  if (!course) {
    course = await Course.create({
      title: entry.title,
      slug,
      description: entry.description || '',
      categoryId,
      thumbnailUrl: entry.thumbnailUrl || null,
      isPublished: Boolean(entry.isPublished),
      isPaid: Boolean(entry.isPaid),
      price: entry.price ?? 0,
      difficulty: entry.difficulty || 'beginner',
      estimatedHours: entry.estimatedHours ?? 0,
      instructorName: entry.instructorName,
      moduleIds: [],
    });
  } else {
    Object.assign(course, {
      title: entry.title,
      description: entry.description || '',
      categoryId,
      thumbnailUrl: entry.thumbnailUrl || null,
      isPublished: Boolean(entry.isPublished),
      isPaid: Boolean(entry.isPaid),
      price: entry.price ?? 0,
      difficulty: entry.difficulty || 'beginner',
      estimatedHours: entry.estimatedHours ?? 0,
      instructorName: entry.instructorName,
      moduleIds: [],
    });
    await course.save();
    await Topic.deleteMany({ courseId: course.courseId });
    await Module.deleteMany({ courseId: course.courseId });
  }

  const moduleIds = [];
  for (const modEntry of entry.modules || []) {
    const mod = await Module.create({
      courseId: course.courseId,
      title: modEntry.title,
      order: modEntry.order,
      topicIds: [],
    });

    const topicIds = [];
    for (const topicEntry of modEntry.topics || []) {
      const topic = await Topic.create({
        moduleId: mod.moduleId,
        courseId: course.courseId,
        title: topicEntry.title,
        contentType: topicEntry.contentType,
        contentUrl: topicEntry.contentUrl || '',
        durationMinutes: topicEntry.durationMinutes ?? 0,
        order: topicEntry.order,
      });
      topicIds.push(topic.topicId);
    }

    mod.topicIds = topicIds;
    await mod.save();
    moduleIds.push(mod.moduleId);
  }

  course.moduleIds = moduleIds;
  await course.save();
  return course;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment');
    process.exit(1);
  }

  const data = loadData();

  await mongoose.connect(process.env.MONGO_URI, { dbName: 'eduelderly-course' });
  console.log('[seed] Connected to MongoDB');

  if (isReset) {
    await wipeCollections();
    console.log('[seed] Wiped course collections');
  }

  const categoryBySlug = {};
  for (const cat of data.categories) {
    const saved = await upsertCategory(cat);
    categoryBySlug[cat.slug] = saved.categoryId;
  }

  for (const courseEntry of data.courses) {
    const categoryId = categoryBySlug[courseEntry.categorySlug];
    if (!categoryId) {
      throw new Error(`Unknown categorySlug: ${courseEntry.categorySlug}`);
    }
    await upsertCourseTree(courseEntry, categoryId);
  }

  const [catCount, courseCount, modCount, topicCount] = await Promise.all([
    Category.countDocuments(),
    Course.countDocuments({ isDeleted: false }),
    Module.countDocuments(),
    Topic.countDocuments(),
  ]);

  console.log('[seed] Done.');
  console.log(`  Categories: ${catCount}`);
  console.log(`  Courses: ${courseCount}`);
  console.log(`  Modules: ${modCount}`);
  console.log(`  Topics: ${topicCount}`);
  console.log(`  Published: ${await Course.countDocuments({ isPublished: true, isDeleted: false })}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
