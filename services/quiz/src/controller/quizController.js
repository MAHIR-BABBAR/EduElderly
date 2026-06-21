const {
  catchAsync,
  toPublicQuizDTO,
  toAttemptResultDTO,
  toAttemptSummaryDTO,
} = require('@eduelderly/shared');
const quizService = require('../services/quiz.service');
const questionService = require('../services/question.service');
const attemptService = require('../services/attempt.service');

const createQuiz = catchAsync(async (req, res) => {
  const quiz = await quizService.createQuiz(req.body);
  res.status(201).json({
    success: true,
    data: toPublicQuizDTO(quiz, []),
  });
});

const addQuestion = catchAsync(async (req, res) => {
  const question = await questionService.addQuestion(req.params.quizId, req.body);
  res.status(201).json({
    success: true,
    data: { questionId: question.questionId, quizId: question.quizId, order: question.order },
  });
});

const getQuiz = catchAsync(async (req, res) => {
  const { quiz, questions } = await quizService.getQuizForLearner(
    req.params.quizId,
    req.user.userId,
  );
  res.status(200).json({
    success: true,
    data: toPublicQuizDTO(quiz, questions),
  });
});

const submitAttempt = catchAsync(async (req, res) => {
  const { attempt, questionFeedback } = await attemptService.submitAttempt(
    req.params.quizId,
    req.user.userId,
    req.body.answers,
  );
  res.status(201).json({
    success: true,
    data: toAttemptResultDTO(attempt, questionFeedback),
  });
});

const listMyAttempts = catchAsync(async (req, res) => {
  const attempts = await attemptService.listMyAttempts(req.user.userId);
  res.status(200).json({
    success: true,
    data: {
      attempts: attempts.map(toAttemptSummaryDTO),
    },
  });
});

const listQuizzesByCourse = catchAsync(async (req, res) => {
  const quizzes = await quizService.listPublishedQuizzesByCourse(
    req.params.courseId,
    req.user.userId,
  );
  res.status(200).json({
    success: true,
    data: {
      quizzes: quizzes.map((quiz) => toPublicQuizDTO(quiz, [])),
    },
  });
});

module.exports = {
  createQuiz,
  addQuestion,
  getQuiz,
  submitAttempt,
  listMyAttempts,
  listQuizzesByCourse,
};
