#!/usr/bin/env node
/**
 * Populate eduelderly-quiz DB from scripts/data/sample-quizzes.json
 * Resolves courseId/moduleId from eduelderly-course by slug + module order.
 *
 *   npm run seed         # upsert by courseSlug + moduleOrder + title
 *   npm run seed:reset   # wipe quiz collections, then seed
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.join(__dirname, '..', '..', 'course', '.env') });
}

const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const { Attempt } = require('../src/models/Attempt');

const DATA_PATH = path.join(__dirname, 'data', 'sample-quizzes.json');
const isReset = process.argv.includes('--reset');

const CourseLookupSchema = new mongoose.Schema({
  courseId: String,
  slug: String,
  isDeleted: Boolean,
});
const ModuleLookupSchema = new mongoose.Schema({
  moduleId: String,
  courseId: String,
  order: Number,
  title: String,
});

const loadData = () => {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(DATA_PATH);
};

const wipeCollections = async () => {
  await Promise.all([
    Attempt.deleteMany({}),
    Question.deleteMany({}),
    Quiz.deleteMany({}),
  ]);
};

const resolveCourseAndModule = async (Course, Module, entry) => {
  const course = await Course.findOne({ slug: entry.courseSlug, isDeleted: false });
  if (!course) {
    throw new Error(`Course not found for slug: ${entry.courseSlug}. Run course seed first.`);
  }

  const mod = await Module.findOne({ courseId: course.courseId, order: entry.moduleOrder });
  if (!mod) {
    throw new Error(
      `Module order ${entry.moduleOrder} not found for course ${entry.courseSlug}`,
    );
  }

  return { course, mod };
};

const upsertQuizTree = async (entry, course, mod) => {
  let quiz = await Quiz.findOne({
    courseId: course.courseId,
    moduleId: mod.moduleId,
    title: entry.title,
  });

  if (!quiz) {
    quiz = await Quiz.create({
      courseId: course.courseId,
      moduleId: mod.moduleId,
      title: entry.title,
      passThreshold: entry.passThreshold ?? 70,
      maxAttempts: entry.maxAttempts ?? 3,
      isPublished: Boolean(entry.isPublished),
    });
  } else {
    quiz.passThreshold = entry.passThreshold ?? 70;
    quiz.maxAttempts = entry.maxAttempts ?? 3;
    quiz.isPublished = Boolean(entry.isPublished);
    await quiz.save();
    await Question.deleteMany({ quizId: quiz.quizId });
  }

  for (const q of entry.questions || []) {
    await Question.create({
      quizId: quiz.quizId,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      order: q.order,
    });
  }

  return quiz;
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  if (!process.env.MONGO_URI) {
    console.warn('[quiz-seed] MONGO_URI not set — using', mongoUri);
  }

  const data = loadData();

  await mongoose.connect(mongoUri, { dbName: 'eduelderly-quiz' });
  console.log('[quiz-seed] Connected to eduelderly-quiz');

  const courseDb = mongoose.connection.useDb('eduelderly-course');
  const Course = courseDb.model('Course', CourseLookupSchema);
  const Module = courseDb.model('Module', ModuleLookupSchema);

  if (isReset) {
    await wipeCollections();
    console.log('[quiz-seed] Wiped quiz collections');
  }

  const seeded = [];
  for (const entry of data.quizzes) {
    const { course, mod } = await resolveCourseAndModule(Course, Module, entry);
    const quiz = await upsertQuizTree(entry, course, mod);
    seeded.push({
      courseSlug: entry.courseSlug,
      moduleOrder: entry.moduleOrder,
      quizId: quiz.quizId,
      title: quiz.title,
      questions: entry.questions.length,
    });
  }

  const [quizCount, questionCount] = await Promise.all([
    Quiz.countDocuments(),
    Question.countDocuments(),
  ]);

  console.log('[quiz-seed] Done.');
  console.log(`  Quizzes: ${quizCount}`);
  console.log(`  Questions: ${questionCount}`);
  console.log('  Seeded:');
  for (const row of seeded) {
    console.log(
      `    ${row.courseSlug} (module ${row.moduleOrder}) → ${row.quizId} (${row.questions} questions)`,
    );
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('[quiz-seed] Failed:', err.message);
  process.exit(1);
});
