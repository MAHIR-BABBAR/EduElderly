const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  moduleId: {
    type: String,
    default: uuidv7,
    unique: true,
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
  order: {
    type: Number,
    required: true,
    min: 0,
  },
  topicIds: {
    type: [String],
    default: [],
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

ModuleSchema.index({ courseId: 1, order: 1 });

const Module = mongoose.model('Module', ModuleSchema);
module.exports = { Module };
