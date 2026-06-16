const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');
const { ENROLLMENT_STATUS_VALUES } = require('@eduelderly/shared/constants/enrollmentStatus');

const EnrollmentSchema = new mongoose.Schema({
  enrollmentId: {
    type: String,
    default: uuidv7,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  courseId: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ENROLLMENT_STATUS_VALUES,
    default: 'active',
  },
  progressPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completedModules: {
    type: [String],
    default: [],
  },
  completedTopics: {
    type: [String],
    default: [],
  },
  currentModuleId: {
    type: String,
    default: null,
  },
  currentLessonId: {
    type: String,
    default: null,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  lastAccessedAt: {
    type: Date,
    default: null,
  },
  totalTimeSpentMinutes: {
    type: Number,
    default: 0,
    min: 0,
  },
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  certificateId: {
    type: String,
    default: null,
  },
  paymentRef: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.__v;
      delete ret._id;
      return ret;
    },
  },
});

EnrollmentSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['active', 'completed'] } },
  },
);

const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
module.exports = { Enrollment };
