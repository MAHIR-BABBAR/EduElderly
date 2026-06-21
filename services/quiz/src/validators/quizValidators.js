const { body, param, validationResult } = require('express-validator');
const { AppError, ERROR_CODES } = require('@eduelderly/shared');

const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(message, 400, ERROR_CODES.E_VALIDATION));
  }
  next();
};

const createQuizRules = [
  body('courseId').notEmpty().withMessage('courseId is required'),
  body('title').notEmpty().trim().isLength({ max: 200 }).withMessage('title is required'),
  body('moduleId').optional().isString(),
  body('passThreshold').optional().isInt({ min: 0, max: 100 }),
  body('maxAttempts').optional().isInt({ min: 1 }),
  body('isPublished').optional().isBoolean(),
  handleValidationErrors,
];

const quizIdRules = [
  param('quizId').notEmpty().withMessage('quizId is required'),
  handleValidationErrors,
];

const addQuestionRules = [
  param('quizId').notEmpty().withMessage('quizId is required'),
  body('prompt').notEmpty().trim().isLength({ max: 1000 }).withMessage('prompt is required'),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options are required'),
  body('options.*').isString().notEmpty().withMessage('Each option must be a non-empty string'),
  body('correctIndex').isInt({ min: 0 }).withMessage('correctIndex is required'),
  body('order').isInt({ min: 0 }).withMessage('order is required'),
  handleValidationErrors,
];

const submitAttemptRules = [
  param('quizId').notEmpty().withMessage('quizId is required'),
  body('answers').isArray({ min: 1 }).withMessage('answers array is required'),
  body('answers.*.questionId').notEmpty().withMessage('questionId is required'),
  body('answers.*.selectedIndex').isInt({ min: 0 }).withMessage('selectedIndex is required'),
  handleValidationErrors,
];

const courseIdRules = [
  param('courseId').notEmpty().withMessage('courseId is required'),
  handleValidationErrors,
];

module.exports = {
  createQuizRules,
  quizIdRules,
  addQuestionRules,
  submitAttemptRules,
  courseIdRules,
};
