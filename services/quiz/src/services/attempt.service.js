const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { Attempt } = require('../models/Attempt');
const quizService = require('./quiz.service');

const countAttempts = async (quizId, userId) =>
  Attempt.countDocuments({ quizId, userId });

const submitAttempt = async (quizId, userId, answers) => {
  const quiz = await quizService.getPublishedQuiz(quizId);
  await quizService.assertEnrollment(userId, quiz.courseId);

  const attemptCount = await countAttempts(quizId, userId);
  if (attemptCount >= quiz.maxAttempts) {
    throw new AppError('Maximum attempts reached', 403, ERROR_CODES.E_MAX_ATTEMPTS);
  }

  const questions = await quizService.getQuestionsForQuiz(quizId);
  if (questions.length === 0) {
    throw new AppError('Quiz has no questions', 400, ERROR_CODES.E_VALIDATION);
  }

  const questionMap = new Map(questions.map((q) => [q.questionId, q]));
  const submittedIds = new Set(answers.map((a) => a.questionId));

  if (submittedIds.size !== questions.length) {
    throw new AppError(
      'All questions must be answered exactly once',
      400,
      ERROR_CODES.E_VALIDATION,
    );
  }

  for (const question of questions) {
    if (!submittedIds.has(question.questionId)) {
      throw new AppError(
        'All questions must be answered exactly once',
        400,
        ERROR_CODES.E_VALIDATION,
      );
    }
  }

  let correctCount = 0;
  const questionFeedback = [];

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      throw new AppError('Invalid questionId in answers', 400, ERROR_CODES.E_VALIDATION);
    }
    if (
      answer.selectedIndex < 0 ||
      answer.selectedIndex >= question.options.length
    ) {
      throw new AppError('selectedIndex out of range', 400, ERROR_CODES.E_VALIDATION);
    }

    const correct = answer.selectedIndex === question.correctIndex;
    if (correct) correctCount += 1;
    questionFeedback.push({ questionId: question.questionId, correct });
  }

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= quiz.passThreshold;

  const attempt = await Attempt.create({
    quizId,
    userId,
    answers,
    score,
    passed,
    submittedAt: new Date(),
  });

  return { attempt, questionFeedback };
};

const listMyAttempts = async (userId) =>
  Attempt.find({ userId }).sort({ submittedAt: -1 });

module.exports = {
  countAttempts,
  submitAttempt,
  listMyAttempts,
};
