const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      default: uuidv7,
      unique: true,
      index: true,
    },
    quizId: {
      type: String,
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: 'At least 2 options are required',
      },
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
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

QuestionSchema.index({ quizId: 1, order: 1 });

const Question = mongoose.model('Question', QuestionSchema);
module.exports = { Question };
