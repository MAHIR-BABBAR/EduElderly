const { v7: uuidv7 } = require('uuid');
const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const AttemptSchema = new mongoose.Schema(
  {
    attemptId: {
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
    userId: {
      type: String,
      required: true,
      index: true,
    },
    answers: {
      type: [AnswerSchema],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
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

AttemptSchema.index({ quizId: 1, userId: 1 });

const Attempt = mongoose.model('Attempt', AttemptSchema);
module.exports = { Attempt };
