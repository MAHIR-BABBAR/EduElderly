const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { Question } = require('../models/Question');
const quizService = require('./quiz.service');

const addQuestion = async (quizId, payload) => {
  const quiz = await quizService.getQuizById(quizId);

  if (payload.correctIndex < 0 || payload.correctIndex >= payload.options.length) {
    throw new AppError(
      'correctIndex must be a valid option index',
      400,
      ERROR_CODES.E_VALIDATION,
    );
  }

  const question = await Question.create({
    quizId: quiz.quizId,
    prompt: payload.prompt,
    options: payload.options,
    correctIndex: payload.correctIndex,
    order: payload.order,
  });

  return question;
};

module.exports = { addQuestion };
