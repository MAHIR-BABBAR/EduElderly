const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');
const { DIFFICULTY_VALUES } = require('@eduelderly/shared/constants/difficulty');

const CourseSchema = new mongoose.Schema({
  courseId: {
    type: String,
    default: uuidv7,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000,
    trim: true,
  },
  categoryId: {
    type: String,
    required: true,
    index: true,
  },
  thumbnailUrl: {
    type: String,
    default: null,
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    default: 0,
    min: 0,
  },
  difficulty: {
    type: String,
    enum: DIFFICULTY_VALUES,
    default: 'beginner',
  },
  estimatedHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  instructorName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  moduleIds: {
    type: [String],
    default: [],
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
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

CourseSchema.index({ title: 'text', description: 'text' });

const Course = mongoose.model('Course', CourseSchema);
module.exports = { Course };
