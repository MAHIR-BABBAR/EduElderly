const express = require('express');
const { extractUser, requireAdmin } = require('@eduelderly/shared');
const {
  createQuiz,
  addQuestion,
  getQuiz,
  submitAttempt,
  listMyAttempts,
  listQuizzesByCourse,
} = require('../controller/quizController');
const {
  createQuizRules,
  quizIdRules,
  addQuestionRules,
  submitAttemptRules,
  courseIdRules,
} = require('../validators/quizValidators');

const router = express.Router();

router.post('/', extractUser, requireAdmin, createQuizRules, createQuiz);
router.get('/attempts/me', extractUser, listMyAttempts);
router.get('/by-course/:courseId', extractUser, courseIdRules, listQuizzesByCourse);
router.post('/:quizId/questions', extractUser, requireAdmin, addQuestionRules, addQuestion);
router.get('/:quizId', extractUser, quizIdRules, getQuiz);
router.post('/:quizId/attempts', extractUser, submitAttemptRules, submitAttempt);

module.exports = router;
