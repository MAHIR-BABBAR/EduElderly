const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema(
  {
    quizId: {
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
    moduleId: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    passThreshold: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        delete ret._id;
        return ret;
      },
    },
  },
);

QuizSchema.index({ courseId: 1, moduleId: 1 });

const Quiz = mongoose.model('Quiz', QuizSchema);
module.exports = { Quiz };
