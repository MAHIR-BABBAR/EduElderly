const { AppError, ERROR_CODES } = require('@eduelderly/shared');
const { ENROLLMENT_STATUS } = require('@eduelderly/shared/constants/enrollmentStatus');
const { Quiz } = require('../models/Quiz');
const { Question } = require('../models/Question');
const enrollmentClient = require('../clients/enrollmentClient');

const createQuiz = async (payload) => {
  const quiz = await Quiz.create({
    courseId: payload.courseId,
    moduleId: payload.moduleId ?? null,
    title: payload.title,
    passThreshold: payload.passThreshold ?? 70,
    maxAttempts: payload.maxAttempts ?? 3,
    isPublished: payload.isPublished ?? false,
  });
  return quiz;
};

const getPublishedQuiz = async (quizId) => {
  const quiz = await Quiz.findOne({ quizId, isPublished: true });
  if (!quiz) {
    throw new AppError('Quiz not found', 404, ERROR_CODES.E_QUIZ_NOT_FOUND);
  }
  return quiz;
};

const getQuizById = async (quizId) => {
  const quiz = await Quiz.findOne({ quizId });
  if (!quiz) {
    throw new AppError('Quiz not found', 404, ERROR_CODES.E_QUIZ_NOT_FOUND);
  }
  return quiz;
};

const getQuestionsForQuiz = async (quizId) =>
  Question.find({ quizId }).sort({ order: 1 });

const assertEnrollment = async (userId, courseId) => {
  const enrollment = await enrollmentClient.getEnrollment(userId, courseId);
  if (!enrollment || enrollment.status !== ENROLLMENT_STATUS.ACTIVE) {
    throw new AppError('Not enrolled in this course', 403, ERROR_CODES.E_NOT_ENROLLED);
  }
};

const getQuizForLearner = async (quizId, userId) => {
  const quiz = await getPublishedQuiz(quizId);
  await assertEnrollment(userId, quiz.courseId);
  const questions = await getQuestionsForQuiz(quizId);
  return { quiz, questions };
};

const listPublishedQuizzesByCourse = async (courseId, userId) => {
  await assertEnrollment(userId, courseId);
  return Quiz.find({ courseId, isPublished: true }).sort({ createdAt: 1 });
};

module.exports = {
  createQuiz,
  getPublishedQuiz,
  getQuizById,
  getQuestionsForQuiz,
  assertEnrollment,
  getQuizForLearner,
  listPublishedQuizzesByCourse,
};
