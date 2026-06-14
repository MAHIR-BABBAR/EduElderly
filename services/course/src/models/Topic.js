const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');
const { CONTENT_TYPE_VALUES } = require('@eduelderly/shared/constants/contentTypes');

const TopicSchema = new mongoose.Schema({
  topicId: {
    type: String,
    default: uuidv7,
    unique: true,
    index: true,
  },
  moduleId: {
    type: String,
    required: true,
    index: true,
  },
  courseId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  contentType: {
    type: String,
    enum: CONTENT_TYPE_VALUES,
    required: true,
  },
  contentUrl: {
    type: String,
    default: '',
    trim: true,
  },
  durationMinutes: {
    type: Number,
    default: 0,
    min: 0,
  },
  order: {
    type: Number,
    required: true,
    min: 0,
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

TopicSchema.index({ moduleId: 1, order: 1 });

const Topic = mongoose.model('Topic', TopicSchema);
module.exports = { Topic };
