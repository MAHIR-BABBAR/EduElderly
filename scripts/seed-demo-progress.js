#!/usr/bin/env node
/**
 * Give the demo learner something to look at: one course in progress (first
 * lesson done) and one course fully completed. Reads the course catalog to
 * pick published free courses, so run the course seed first.
 *
 * Idempotent: existing demo enrollments are replaced.
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { DEMO_USERS } = require('./seed-demo-user');

dotenv.config({ path: path.join(__dirname, '..', 'services', 'course', '.env') });

const learner = DEMO_USERS.find((u) => u.role === 'learner');

const CourseSchema = new mongoose.Schema({
  courseId: String, title: String, isPublished: Boolean, isPaid: Boolean, isDeleted: Boolean, createdAt: Date,
});
const ModuleSchema = new mongoose.Schema({ moduleId: String, courseId: String, order: Number, topicIds: [String] });
const EnrollmentSchema = new mongoose.Schema({
  enrollmentId: String,
  userId: String,
  courseId: String,
  status: String,
  progressPercent: Number,
  completedModules: [String],
  completedTopics: [String],
  currentModuleId: String,
  currentLessonId: String,
  enrolledAt: Date,
  startedAt: Date,
  completedAt: Date,
  lastAccessedAt: Date,
  totalTimeSpentMinutes: Number,
  certificateIssued: Boolean,
  certificateId: String,
  courseCompletionXpAwarded: Boolean,
  paymentRef: String,
}, { timestamps: true });

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const buildEnrollment = ({ course, modules, completedTopicCount, daysSinceEnrolled }) => {
  const orderedModules = [...modules].sort((a, b) => a.order - b.order);
  const allTopics = orderedModules.flatMap((m) => m.topicIds);
  const completedTopics = allTopics.slice(0, completedTopicCount);
  const completedSet = new Set(completedTopics);
  const completedModules = orderedModules
    .filter((m) => m.topicIds.length && m.topicIds.every((t) => completedSet.has(t)))
    .map((m) => m.moduleId);
  const done = completedTopics.length === allTopics.length && allTopics.length > 0;
  const lastTopic = completedTopics[completedTopics.length - 1] || null;
  const lastModule = lastTopic ? orderedModules.find((m) => m.topicIds.includes(lastTopic)).moduleId : null;

  return {
    enrollmentId: `demo-enr-${course.courseId}`,
    userId: learner.userId,
    courseId: course.courseId,
    status: done ? 'completed' : 'active',
    progressPercent: allTopics.length ? Math.round((completedTopics.length / allTopics.length) * 100) : 0,
    completedModules,
    completedTopics,
    currentModuleId: lastModule,
    currentLessonId: lastTopic,
    enrolledAt: daysAgo(daysSinceEnrolled),
    startedAt: completedTopics.length ? daysAgo(daysSinceEnrolled) : null,
    completedAt: done ? daysAgo(1) : null,
    lastAccessedAt: daysAgo(done ? 1 : 0),
    totalTimeSpentMinutes: completedTopics.length * 9,
    certificateIssued: false,
    certificateId: null,
    courseCompletionXpAwarded: done,
    paymentRef: null,
  };
};

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  await mongoose.connect(uri, { dbName: 'eduelderly-course' });

  const Course = mongoose.model('Course', CourseSchema);
  const Module = mongoose.model('Module', ModuleSchema);
  const Enrollment = mongoose.connection.useDb('eduelderly-enrollment').model('Enrollment', EnrollmentSchema);

  const courses = await Course.find({ isPublished: true, isPaid: false, isDeleted: false }).sort({ createdAt: 1 }).limit(2);
  if (courses.length === 0) {
    console.warn('[demo-progress] No published free courses found. Run the course seed first.');
    await mongoose.disconnect();
    return;
  }

  await Enrollment.deleteMany({ userId: learner.userId });

  const [inProgress, completed] = courses;
  const seeded = [];

  const modsA = await Module.find({ courseId: inProgress.courseId });
  seeded.push(await Enrollment.create(buildEnrollment({ course: inProgress, modules: modsA, completedTopicCount: 1, daysSinceEnrolled: 3 })));

  if (completed) {
    const modsB = await Module.find({ courseId: completed.courseId });
    const total = modsB.reduce((n, m) => n + m.topicIds.length, 0);
    seeded.push(await Enrollment.create(buildEnrollment({ course: completed, modules: modsB, completedTopicCount: total, daysSinceEnrolled: 14 })));
  }

  for (const e of seeded) {
    const course = courses.find((c) => c.courseId === e.courseId);
    console.log(`[demo-progress] ${e.status.padEnd(9)} ${e.progressPercent}%  ${course.title}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('[demo-progress] Failed:', err.message);
  process.exit(1);
});
